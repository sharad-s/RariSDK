import { createContract, toBN } from "../../../utils/web3.js";
import JumpRateModel from "./JumpRateModel.js";
import { contracts } from "../contracts/compound-protocol.min.json";
import { BigNumber } from "@ethersproject/bignumber";
import { BigNumberish } from "ethers";

export default class DAIInterestRateModelV2 extends JumpRateModel {
  static RUNTIME_BYTECODE_HASH = "0x4b4c4f6386fd72d3f041a03e9eee3945189457fcf4299e99098d360a9f619539";

  initialized: boolean;

  dsrPerBlock: BigNumber;

  cash: BigNumber;
  borrows: BigNumber;
  reserves: BigNumber;
  reserveFactorMantissa: BigNumber;

  async init(web3, interestRateModelAddress, assetAddress) {
    await super.init(web3, interestRateModelAddress, assetAddress);

    const interestRateContract = createContract(
      interestRateModelAddress,
      contracts["contracts/DAIInterestRateModelV2.sol:DAIInterestRateModelV2"].abi,
    );

    this.dsrPerBlock = toBN(await interestRateContract.callStatic.dsrPerBlock());

    const cTokenContract = createContract(
      assetAddress,
      contracts["contracts/CTokenInterfaces.sol:CTokenInterface"].abi,
    );

    this.cash = toBN(await cTokenContract.callStatic.getCash());
    this.borrows = toBN(await cTokenContract.callStatic.totalBorrowsCurrent());
    this.reserves = toBN(await cTokenContract.callStatic.totalReserves());
  }

  async _init(
    web3,
    interestRateModelAddress: string,
    reserveFactorMantissa: BigNumberish,
    adminFeeMantissa: BigNumberish,
    fuseFeeMantissa: BigNumberish,
  ) {
    await super._init(web3, interestRateModelAddress, reserveFactorMantissa, adminFeeMantissa, fuseFeeMantissa);

    const interestRateContract = createContract(
      interestRateModelAddress,
      contracts["contracts/DAIInterestRateModelV2.sol:DAIInterestRateModelV2"].abi,
    );
    this.dsrPerBlock = toBN(await interestRateContract.callStatic.dsrPerBlock());
    this.cash = toBN(0);
    this.borrows = toBN(0);
    this.reserves = toBN(0);
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
    await super.__init(
      baseRatePerBlock,
      multiplierPerBlock,
      jumpMultiplierPerBlock,
      kink,
      reserveFactorMantissa,
      adminFeeMantissa,
      fuseFeeMantissa,
    );
    this.dsrPerBlock = toBN(0); // TODO: Make this work if DSR ever goes positive again
    this.cash = toBN(0);
    this.borrows = toBN(0);
    this.reserves = toBN(0);
  }

  getSupplyRate(utilizationRate: BigNumber) {
    if (!this.initialized) throw new Error("Interest rate model class not initialized.");

    // const protocolRate = super.getSupplyRate(utilizationRate, this.reserveFactorMantissa); //todo - do we need this
    const protocolRate = super.getSupplyRate(utilizationRate);
    const underlying = this.cash.add(this.borrows).sub(this.reserves);

    if (underlying.isZero()) {
      return protocolRate;
    } else {
      const cashRate = this.cash.mul(this.dsrPerBlock).div(underlying);
      return cashRate.add(protocolRate);
    }
  }
}
