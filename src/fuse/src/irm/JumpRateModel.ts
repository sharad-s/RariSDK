import { BigNumberish, BigNumber } from "ethers";
import { createContract, toBN } from "../../../utils/web3";
import { contracts } from "../contracts/compound-protocol.min.json";

export default class JumpRateModel {
  static RUNTIME_BYTECODE_HASH = "0x00f083d6c0022358b6b3565c026e815cfd6fc9dcd6c3ad1125e72cbb81f41b2a";

  initialized: boolean;
  baseRatePerBlock: BigNumber;
  multiplierPerBlock: BigNumber;
  jumpMultiplierPerBlock: BigNumber;
  kink: BigNumber;
  reserveFactorMantissa: BigNumber;

  async init(web3, interestRateModelAddress: string, assetAddress: string) {
    const jumpRateModelContract = createContract(
      interestRateModelAddress,
      contracts["contracts/JumpRateModel.sol:JumpRateModel"].abi,
    );
    this.baseRatePerBlock = toBN(await jumpRateModelContract.callStatic.baseRatePerBlock());
    this.multiplierPerBlock = toBN(await jumpRateModelContract.callStatic.multiplierPerBlock());
    this.jumpMultiplierPerBlock = toBN(await jumpRateModelContract.callStatic.jumpMultiplierPerBlock());
    this.kink = toBN(await jumpRateModelContract.callStatic.kink());
    
    const cTokenContract = createContract(
      assetAddress,
      JSON.parse(contracts["contracts/CTokenInterfaces.sol:CTokenInterface"].abi),
    );
    this.reserveFactorMantissa = toBN(await cTokenContract.callStatic.reserveFactorMantissa());
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(
      toBN(await cTokenContract.callStatic.adminFeeMantissa()),
    );
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(
      toBN(await cTokenContract.callStatic.fuseFeeMantissa()),
    );
    this.initialized = true;
  }

  async _init(
    web3,
    interestRateModelAddress: string,
    reserveFactorMantissa: BigNumberish,
    adminFeeMantissa: BigNumberish,
    fuseFeeMantissa: BigNumberish,
  ) {
    const jumpRateModelContract = createContract(
      interestRateModelAddress,
      contracts["contracts/JumpRateModel.sol:JumpRateModel"].abi,
    );
    this.baseRatePerBlock = toBN(await jumpRateModelContract.callStatic.baseRatePerBlock());
    this.multiplierPerBlock = toBN(await jumpRateModelContract.callStatic.multiplierPerBlock());
    this.jumpMultiplierPerBlock = toBN(await jumpRateModelContract.callStatic.jumpMultiplierPerBlock());
    this.kink = toBN(await jumpRateModelContract.callStatic.kink());

    this.reserveFactorMantissa = toBN(reserveFactorMantissa);
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(adminFeeMantissa));
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(fuseFeeMantissa));

    this.initialized = true;
  }

  async __init(
    baseRatePerBlock: BigNumberish,
    multiplierPerBlock: BigNumberish,
    jumpMultiplierPerBlock: BigNumberish,
    kink: BigNumberish,
    reserveFactorMantissa: BigNumberish,
    adminFeeMantissa: BigNumberish,
    fuseFeeMantissa: BigNumberish,
  ) {
    this.baseRatePerBlock = toBN(baseRatePerBlock);
    this.multiplierPerBlock = toBN(multiplierPerBlock);
    this.jumpMultiplierPerBlock = toBN(jumpMultiplierPerBlock);
    this.kink = toBN(kink);

    this.reserveFactorMantissa = toBN(reserveFactorMantissa);
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(adminFeeMantissa));
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(fuseFeeMantissa));

    this.initialized = true;
  }

  getBorrowRate(utilizationRate: BigNumber) {
    if (!this.initialized) throw new Error("Interest rate model class not initialized.");
    if (utilizationRate.lte(this.kink)) {
      return utilizationRate.mul(this.multiplierPerBlock).div(toBN(1e18)).add(this.baseRatePerBlock);
    } 
    else {
      const normalRate = this.kink.mul(this.multiplierPerBlock).div(toBN(1e18)).add(this.baseRatePerBlock);
      const excessUtil = utilizationRate.sub(this.kink);
      return excessUtil.mul(this.jumpMultiplierPerBlock).div(toBN(1e18)).add(normalRate);
    }
  }

  getSupplyRate(utilizationRate: BigNumber) {
    if (!this.initialized) throw new Error("Interest rate model class not initialized.");
    const oneMinusReserveFactor = toBN(1e18).sub(this.reserveFactorMantissa);
    const borrowRate = this.getBorrowRate(utilizationRate);
    const rateToPool = borrowRate.mul(oneMinusReserveFactor).div(toBN(1e18));
    return utilizationRate.mul(rateToPool).div(toBN(1e18));
  }
}
