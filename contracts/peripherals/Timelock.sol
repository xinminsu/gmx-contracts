// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

pragma experimental ABIEncoderV2;

import "./interfaces/ITimelockTarget.sol";
import "./interfaces/ITimelock.sol";
import "./interfaces/IHandlerTarget.sol";
import "./BasicMulticall.sol";

import "../access/interfaces/IAdmin.sol";
import "../access/interfaces/IGovRequester.sol";
import "../access/Governable.sol";
import "../core/interfaces/IVault.sol";
import "../core/interfaces/IVaultUtils.sol";
import "../core/interfaces/IGlpManager.sol";
import "../referrals/interfaces/IReferralStorage.sol";
import "../tokens/interfaces/IYieldToken.sol";
import "../tokens/interfaces/IBaseToken.sol";
import "../tokens/interfaces/IMintable.sol";
import "../tokens/interfaces/IUSDG.sol";
import "../staking/interfaces/IVester.sol";
import "../staking/interfaces/IRewardRouterV2.sol";

import "../libraries/math/SafeMath.sol";
import "../libraries/token/IERC20.sol";

contract Timelock is ITimelock, BasicMulticall {
    using SafeMath for uint256;

    uint256 public constant PRICE_PRECISION = 10 ** 30;
    uint256 public constant MAX_BUFFER = 5 days;
    uint256 public constant MAX_FUNDING_RATE_FACTOR = 200; // 0.02%
    uint256 public constant MAX_LEVERAGE_VALIDATION = 500000; // 50x

    uint256 public buffer;
    address public admin;

    address public tokenManager;
    address public mintReceiver;
    address public glpManager;
    address public prevGlpManager;
    address public rewardRouter;
    uint256 public maxTokenSupply;

    uint256 public override marginFeeBasisPoints;
    uint256 public maxMarginFeeBasisPoints;
    bool public shouldToggleIsLeverageEnabled;

    mapping (bytes32 => uint256) public pendingActions;

    mapping (address => bool) public isHandler;
    mapping (address => bool) public isKeeper;
    mapping (address => bool) public isFeeHandler;

    mapping (address => bool) public govRequesters;

    event SignalPendingAction(bytes32 action);
    event SignalApprove(address token, address spender, uint256 amount, bytes32 action);
    event SignalWithdrawToken(address target, address token, address receiver, uint256 amount, bytes32 action);
    event SignalMint(address token, address receiver, uint256 amount, bytes32 action);
    event SignalSetGov(address target, address gov, bytes32 action);
    event SignalSetHandler(address target, address handler, bool isActive, bytes32 action);
    event SignalSetMinter(address target, address minter, bool isActive, bytes32 action);
    event SignalSetPriceFeed(address vault, address priceFeed, bytes32 action);
    event SignalSetGovRequester(address requester);
    event SignalRedeemUsdg(address vault, address token, uint256 amount);
    event SignalVaultSetTokenConfig(
        address vault,
        address token,
        uint256 tokenDecimals,
        uint256 tokenWeight,
        uint256 minProfitBps,
        uint256 maxUsdgAmount,
        bool isStable,
        bool isShortable
    );
    event ClearAction(bytes32 action);

    modifier onlyAdmin() {
        require(msg.sender == admin, "forbidden");
        _;
    }

    modifier onlyHandlerAndAbove() {
        require(msg.sender == admin || isHandler[msg.sender], "forbidden");
        _;
    }

    modifier onlyKeeperAndAbove() {
        require(msg.sender == admin || isHandler[msg.sender] || isKeeper[msg.sender], "forbidden");
        _;
    }

    modifier onlyTokenManager() {
        require(msg.sender == tokenManager, "forbidden");
        _;
    }

    modifier onlyGovRequester() {
        require(govRequesters[msg.sender], "forbidden");
        _;
    }

    modifier onlyFeeHandler() {
        require(isFeeHandler[msg.sender], "forbidden");
        _;
    }

    constructor(
        address _admin,
        uint256 _buffer,
        address _tokenManager,
        address _mintReceiver,
        address _glpManager,
        address _prevGlpManager,
        address _rewardRouter,
        uint256 _maxTokenSupply,
        uint256 _marginFeeBasisPoints,
        uint256 _maxMarginFeeBasisPoints
    ) public {
        require(_buffer <= MAX_BUFFER, "invalid _buffer");
        admin = _admin;
        buffer = _buffer;
        tokenManager = _tokenManager;
        mintReceiver = _mintReceiver;
        glpManager = _glpManager;
        prevGlpManager = _prevGlpManager;
        rewardRouter = _rewardRouter;
        maxTokenSupply = _maxTokenSupply;

        marginFeeBasisPoints = _marginFeeBasisPoints;
        maxMarginFeeBasisPoints = _maxMarginFeeBasisPoints;
    }

    function requestGov(address[] memory _targets) external override onlyGovRequester {
        // handover gov to requester
        for (uint256 i; i < _targets.length; i++) {
            Governable(_targets[i]).setGov(msg.sender);
        }

        IGovRequester(msg.sender).afterGovGranted();

        // validate that gov was handed back
        for (uint256 i; i < _targets.length; i++) {
            require(Governable(_targets[i]).gov() == address(this), "gov != this");
        }
    }

    function setAdmin(address _admin) external override onlyTokenManager {
        admin = _admin;
    }

    function setExternalAdmin(address _target, address _admin) external onlyAdmin {
        require(_target != address(this), "invalid _target");
        IAdmin(_target).setAdmin(_admin);
    }

    function setContractHandler(address _handler, bool _isActive) external onlyAdmin {
        isHandler[_handler] = _isActive;
    }

    function setKeeper(address _keeper, bool _isActive) external onlyAdmin {
        isKeeper[_keeper] = _isActive;
    }

    function setFeeHandler(address _handler, bool _isActive) external onlyAdmin {
        isFeeHandler[_handler] = _isActive;
    }

    function setBuffer(uint256 _buffer) external onlyAdmin {
        require(_buffer <= MAX_BUFFER, "invalid _buffer");
        require(_buffer > buffer, "buffer cannot be decreased");
        buffer = _buffer;
    }

    function setMaxLeverage(address _vault, uint256 _maxLeverage) external onlyAdmin {
      require(_maxLeverage > MAX_LEVERAGE_VALIDATION, "invalid _maxLeverage");
      IVault(_vault).setMaxLeverage(_maxLeverage);
    }

    function setFundingRate(address _vault, uint256 _fundingInterval, uint256 _fundingRateFactor, uint256 _stableFundingRateFactor) external onlyKeeperAndAbove {
        require(_fundingRateFactor < MAX_FUNDING_RATE_FACTOR, "invalid _fundingRateFactor");
        require(_stableFundingRateFactor < MAX_FUNDING_RATE_FACTOR, "invalid _stableFundingRateFactor");
        IVault(_vault).setFundingRate(_fundingInterval, _fundingRateFactor, _stableFundingRateFactor);
    }

    function setShouldToggleIsLeverageEnabled(bool _shouldToggleIsLeverageEnabled) external onlyHandlerAndAbove {
        shouldToggleIsLeverageEnabled = _shouldToggleIsLeverageEnabled;
    }

    function setMarginFeeBasisPoints(uint256 _marginFeeBasisPoints, uint256 _maxMarginFeeBasisPoints) external onlyHandlerAndAbove {
        marginFeeBasisPoints = _marginFeeBasisPoints;
        maxMarginFeeBasisPoints = _maxMarginFeeBasisPoints;
    }

    function setSwapFees(
        address _vault,
        uint256 _taxBasisPoints,
        uint256 _stableTaxBasisPoints,
        uint256 _mintBurnFeeBasisPoints,
        uint256 _swapFeeBasisPoints,
        uint256 _stableSwapFeeBasisPoints
    ) external onlyKeeperAndAbove {
        IVault vault = IVault(_vault);

        vault.setFees(
            _taxBasisPoints,
            _stableTaxBasisPoints,
            _mintBurnFeeBasisPoints,
            _swapFeeBasisPoints,
            _stableSwapFeeBasisPoints,
            maxMarginFeeBasisPoints,
            vault.liquidationFeeUsd(),
            vault.minProfitTime(),
            vault.hasDynamicFees()
        );
    }

    // assign _marginFeeBasisPoints to this.marginFeeBasisPoints
    // because enableLeverage would update Vault.marginFeeBasisPoints to this.marginFeeBasisPoints
    // and disableLeverage would reset the Vault.marginFeeBasisPoints to this.maxMarginFeeBasisPoints
    function setFees(
        address _vault,
        uint256 _taxBasisPoints,
        uint256 _stableTaxBasisPoints,
        uint256 _mintBurnFeeBasisPoints,
        uint256 _swapFeeBasisPoints,
        uint256 _stableSwapFeeBasisPoints,
        uint256 _marginFeeBasisPoints,
        uint256 _liquidationFeeUsd,
        uint256 _minProfitTime,
        bool _hasDynamicFees
    ) external onlyKeeperAndAbove {
        marginFeeBasisPoints = _marginFeeBasisPoints;

        IVault(_vault).setFees(
            _taxBasisPoints,
            _stableTaxBasisPoints,
            _mintBurnFeeBasisPoints,
            _swapFeeBasisPoints,
            _stableSwapFeeBasisPoints,
            maxMarginFeeBasisPoints,
            _liquidationFeeUsd,
            _minProfitTime,
            _hasDynamicFees
        );
    }

    function enableLeverage(address _vault) external override onlyHandlerAndAbove {
        IVault vault = IVault(_vault);

        if (shouldToggleIsLeverageEnabled) {
            vault.setIsLeverageEnabled(true);
        }

        vault.setFees(
            vault.taxBasisPoints(),
            vault.stableTaxBasisPoints(),
            vault.mintBurnFeeBasisPoints(),
            vault.swapFeeBasisPoints(),
            vault.stableSwapFeeBasisPoints(),
            marginFeeBasisPoints,
            vault.liquidationFeeUsd(),
            vault.minProfitTime(),
            vault.hasDynamicFees()
        );
    }

    function disableLeverage(address _vault) external override onlyHandlerAndAbove {
        IVault vault = IVault(_vault);

        if (shouldToggleIsLeverageEnabled) {
            vault.setIsLeverageEnabled(false);
        }

        vault.setFees(
            vault.taxBasisPoints(),
            vault.stableTaxBasisPoints(),
            vault.mintBurnFeeBasisPoints(),
            vault.swapFeeBasisPoints(),
            vault.stableSwapFeeBasisPoints(),
            maxMarginFeeBasisPoints, // marginFeeBasisPoints
            vault.liquidationFeeUsd(),
            vault.minProfitTime(),
            vault.hasDynamicFees()
        );
    }

    function setIsLeverageEnabled(address _vault, bool _isLeverageEnabled) external override onlyHandlerAndAbove {
        IVault(_vault).setIsLeverageEnabled(_isLeverageEnabled);
    }

    function setTokenConfig(
        address _vault,
        address _token,
        uint256 _tokenWeight,
        uint256 _minProfitBps,
        uint256 _maxUsdgAmount,
        uint256 _bufferAmount,
        uint256 _usdgAmount
    ) external onlyKeeperAndAbove {
        require(_minProfitBps <= 500, "invalid _minProfitBps");

        IVault vault = IVault(_vault);
        require(vault.whitelistedTokens(_token), "token not yet whitelisted");

        uint256 tokenDecimals = vault.tokenDecimals(_token);
        bool isStable = vault.stableTokens(_token);
        bool isShortable = vault.shortableTokens(_token);

        IVault(_vault).setTokenConfig(
            _token,
            tokenDecimals,
            _tokenWeight,
            _minProfitBps,
            _maxUsdgAmount,
            isStable,
            isShortable
        );

        IVault(_vault).setBufferAmount(_token, _bufferAmount);

        IVault(_vault).setUsdgAmount(_token, _usdgAmount);
    }

    function setUsdgAmounts(address _vault, address[] memory _tokens, uint256[] memory _usdgAmounts) external onlyKeeperAndAbove {
        for (uint256 i = 0; i < _tokens.length; i++) {
            IVault(_vault).setUsdgAmount(_tokens[i], _usdgAmounts[i]);
        }
    }

    function updateUsdgSupply(address _glpManager, uint256 usdgAmount) external onlyKeeperAndAbove {
        require(_glpManager == glpManager || _glpManager == prevGlpManager, "invalid _glpManager");

        address usdg = IGlpManager(_glpManager).usdg();
        uint256 balance = IERC20(usdg).balanceOf(_glpManager);

        IUSDG(usdg).addVault(address(this));

        if (usdgAmount > balance) {
            uint256 mintAmount = usdgAmount.sub(balance);
            IUSDG(usdg).mint(_glpManager, mintAmount);
        } else {
            uint256 burnAmount = balance.sub(usdgAmount);
            IUSDG(usdg).burn(_glpManager, burnAmount);
        }

        IUSDG(usdg).removeVault(address(this));
    }

    function setShortsTrackerAveragePriceWeight(uint256 _shortsTrackerAveragePriceWeight) external onlyAdmin {
        IGlpManager(glpManager).setShortsTrackerAveragePriceWeight(_shortsTrackerAveragePriceWeight);
    }

    function setGlpCooldownDuration(uint256 _cooldownDuration) external onlyAdmin {
        require(_cooldownDuration < 2 hours, "invalid _cooldownDuration");
        IGlpManager(glpManager).setCooldownDuration(_cooldownDuration);
    }

    function setMaxGlobalShortSize(address _vault, address _token, uint256 _amount) external onlyAdmin {
        IVault(_vault).setMaxGlobalShortSize(_token, _amount);
    }

    function removeAdmin(address _token, address _account) external onlyAdmin {
        IYieldToken(_token).removeAdmin(_account);
    }

    function setIsSwapEnabled(address _vault, bool _isSwapEnabled) external onlyKeeperAndAbove {
        IVault(_vault).setIsSwapEnabled(_isSwapEnabled);
    }

    function setTier(address _referralStorage, uint256 _tierId, uint256 _totalRebate, uint256 _discountShare) external onlyKeeperAndAbove {
        IReferralStorage(_referralStorage).setTier(_tierId, _totalRebate, _discountShare);
    }

    function setReferrerTier(address _referralStorage, address _referrer, uint256 _tierId) external onlyKeeperAndAbove {
        IReferralStorage(_referralStorage).setReferrerTier(_referrer, _tierId);
    }

    function govSetCodeOwner(address _referralStorage, bytes32 _code, address _newAccount) external onlyKeeperAndAbove {
        IReferralStorage(_referralStorage).govSetCodeOwner(_code, _newAccount);
    }

    function setVaultUtils(address _vault, IVaultUtils _vaultUtils) external onlyAdmin {
        IVault(_vault).setVaultUtils(_vaultUtils);
    }

    function setMaxGasPrice(address _vault, uint256 _maxGasPrice) external onlyAdmin {
        require(_maxGasPrice > 5000000000, "Invalid _maxGasPrice");
        IVault(_vault).setMaxGasPrice(_maxGasPrice);
    }

    function withdrawFees(address _vault, address _token, address _receiver) external onlyFeeHandler {
        IVault(_vault).withdrawFees(_token, _receiver);
    }

    function batchWithdrawFees(address _vault, address[] memory _tokens) external onlyKeeperAndAbove {
        for (uint256 i = 0; i < _tokens.length; i++) {
            IVault(_vault).withdrawFees(_tokens[i], admin);
        }
    }

    function setInPrivateLiquidationMode(address _vault, bool _inPrivateLiquidationMode) external onlyAdmin {
        IVault(_vault).setInPrivateLiquidationMode(_inPrivateLiquidationMode);
    }

    function setLiquidator(address _vault, address _liquidator, bool _isActive) external onlyAdmin {
        IVault(_vault).setLiquidator(_liquidator, _isActive);
    }

    function setInPrivateTransferMode(address _token, bool _inPrivateTransferMode) external onlyAdmin {
        IBaseToken(_token).setInPrivateTransferMode(_inPrivateTransferMode);
    }

    function batchSetBonusRewards(address _vester, address[] memory _accounts, uint256[] memory _amounts) external onlyKeeperAndAbove {
        require(_accounts.length == _amounts.length, "invalid lengths");

        IHandlerTarget(_vester).setHandler(address(this), true);

        for (uint256 i = 0; i < _accounts.length; i++) {
            address account = _accounts[i];
            uint256 amount = _amounts[i];
            IVester(_vester).setBonusRewards(account, amount);
        }

        IHandlerTarget(_vester).setHandler(address(this), false);
    }

    function batchIncreaseBonusRewards(address _vester, address[] memory _accounts, uint256[] memory _amounts) external onlyKeeperAndAbove {
        require(_accounts.length == _amounts.length, "invalid lengths");

        IHandlerTarget(_vester).setHandler(address(this), true);

        for (uint256 i = 0; i < _accounts.length; i++) {
            address account = _accounts[i];
            uint256 bonusReward = IVester(_vester).bonusRewards(account);
            uint256 amount = _amounts[i];
            IVester(_vester).setBonusRewards(account, bonusReward.add(amount));
        }

        IHandlerTarget(_vester).setHandler(address(this), false);
    }

    function transferIn(address _sender, address _token, uint256 _amount) external onlyAdmin {
        IERC20(_token).transferFrom(_sender, address(this), _amount);
    }

    function signalApprove(address _token, address _spender, uint256 _amount) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("approve", _token, _spender, _amount));
        _setPendingAction(action);
        emit SignalApprove(_token, _spender, _amount, action);
    }

    function approve(address _token, address _spender, uint256 _amount) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("approve", _token, _spender, _amount));
        _validateAction(action);
        _clearAction(action);
        IERC20(_token).approve(_spender, _amount);
    }

    function signalWithdrawToken(address _target, address _token, address _receiver, uint256 _amount) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("withdrawToken", _target, _token, _receiver, _amount));
        _setPendingAction(action);
        emit SignalWithdrawToken(_target, _token, _receiver, _amount, action);
    }

    function withdrawToken(address _target, address _token, address _receiver, uint256 _amount) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("withdrawToken", _target, _token, _receiver, _amount));
        _validateAction(action);
        _clearAction(action);
        IBaseToken(_target).withdrawToken(_token, _receiver, _amount);
    }

    function signalMint(address _token, address _receiver, uint256 _amount) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("mint", _token, _receiver, _amount));
        _setPendingAction(action);
        emit SignalMint(_token, _receiver, _amount, action);
    }

    function processMint(address _token, address _receiver, uint256 _amount) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("mint", _token, _receiver, _amount));
        _validateAction(action);
        _clearAction(action);

        _mint(_token, _receiver, _amount);
    }

    // process to change gov:
    // - a.gov() == gov_1
    // - gov_1.signalSetGov(a, gov_2)
    // - gov_2.acceptGov(a)
    function signalSetGov(address _target, address _gov) external override onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setGov", _target, _gov));
        _setPendingAction(action);
        emit SignalSetGov(_target, _gov, action);
    }

    function acceptGov(address _target) external onlyAdmin {
        address prevGov = Governable(_target).gov();
        ITimelock(prevGov).setGov(_target);
    }

    function setGov(address _target) external override {
        address _gov = msg.sender;
        bytes32 action = keccak256(abi.encodePacked("setGov", _target, _gov));

        _validateAction(action);
        _clearAction(action);

        ITimelockTarget(_target).setGov(_gov);
    }

    function signalSetHandler(address _target, address _handler, bool _isActive) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setHandler", _target, _handler, _isActive));
        _setPendingAction(action);
        emit SignalSetHandler(_target, _handler, _isActive, action);
    }

    function setHandler(address _target, address _handler, bool _isActive) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setHandler", _target, _handler, _isActive));
        _validateAction(action);
        _clearAction(action);
        IHandlerTarget(_target).setHandler(_handler, _isActive);
    }

    function signalSetMinter(address _target, address _minter, bool _isActive) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setMinter", _target, _minter, _isActive));
        _setPendingAction(action);
        emit SignalSetMinter(_target, _minter, _isActive, action);
    }

    function setMinter(address _target, address _minter, bool _isActive) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setMinter", _target, _minter, _isActive));
        _validateAction(action);
        _clearAction(action);
        IMintable(_target).setMinter(_minter, _isActive);
    }

    function signalSetPriceFeed(address _vault, address _priceFeed) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setPriceFeed", _vault, _priceFeed));
        _setPendingAction(action);
        emit SignalSetPriceFeed(_vault, _priceFeed, action);
    }

    function setPriceFeed(address _vault, address _priceFeed) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setPriceFeed", _vault, _priceFeed));
        _validateAction(action);
        _clearAction(action);
        IVault(_vault).setPriceFeed(_priceFeed);
    }

    function signalSetGovRequester(address _requester, bool _isActive) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setGovRequester", _requester, _isActive));
        _setPendingAction(action);
        emit SignalSetGovRequester(_requester);
    }

    function setGovRequester(address _requester, bool _isActive) external onlyAdmin {
        bytes32 action = keccak256(abi.encodePacked("setGovRequester", _requester, _isActive));
        _validateAction(action);
        _clearAction(action);
        govRequesters[_requester] = _isActive;
    }

    function cancelAction(bytes32 _action) external onlyAdmin {
        _clearAction(_action);
    }

    function _mint(address _token, address _receiver, uint256 _amount) private {
        IMintable mintable = IMintable(_token);

        mintable.setMinter(address(this), true);

        mintable.mint(_receiver, _amount);
        require(IERC20(_token).totalSupply() <= maxTokenSupply, "maxTokenSupply exceeded");

        mintable.setMinter(address(this), false);
    }

    function _setPendingAction(bytes32 _action) private {
        require(pendingActions[_action] == 0, "action already signalled");
        pendingActions[_action] = block.timestamp.add(buffer);
        emit SignalPendingAction(_action);
    }

    function _validateAction(bytes32 _action) private view {
        require(pendingActions[_action] != 0, "action not signalled");
        require(pendingActions[_action] < block.timestamp, "action time not yet passed");
    }

    function _clearAction(bytes32 _action) private {
        require(pendingActions[_action] != 0, "invalid _action");
        delete pendingActions[_action];
        emit ClearAction(_action);
    }
}
