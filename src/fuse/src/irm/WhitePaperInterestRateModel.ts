import { BigNumber, BigNumberish } from "ethers";
import { createContract, toBN } from "../../../utils/web3";
import { contracts } from "../contracts/compound-protocol.min.json";

export default class WhitePaperInterestRateModel {
  static RUNTIME_BYTECODE_HASH = "0xe3164248fb86cce0eb8037c9a5c8d05aac2b2ebdb46741939be466a7b17d0b83";

  initialized: boolean;
  baseRatePerBlock: BigNumber;
  multiplierPerBlock: BigNumber;
  reserveFactorMantissa: BigNumber;

  async init(web3, interestRateModelAddress: string, assetAddress: string) {
    const whitePaperModelContract = createContract(
      interestRateModelAddress,
      contracts["contracts/WhitePaperInterestRateModel.sol:WhitePaperInterestRateModel"].abi,
    );

    this.baseRatePerBlock = toBN(await whitePaperModelContract.callStatic.baseRatePerBlock());
    this.multiplierPerBlock = toBN(await whitePaperModelContract.callStatic.multiplierPerBlock());

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
    const whitePaperModelContract = createContract(
      interestRateModelAddress,
      contracts["contracts/WhitePaperInterestRateModel.sol:WhitePaperInterestRateModel"].abi,
    );

    this.baseRatePerBlock = toBN(await whitePaperModelContract.callStatic.baseRatePerBlock());
    this.multiplierPerBlock = toBN(await whitePaperModelContract.callStatic.multiplierPerBlock());

    this.reserveFactorMantissa = toBN(reserveFactorMantissa);
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(adminFeeMantissa));
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(fuseFeeMantissa));

    this.initialized = true;
  }

  async __init(
    baseRatePerBlock: BigNumberish,
    multiplierPerBlock: BigNumberish,
    reserveFactorMantissa: BigNumberish,
    adminFeeMantissa: BigNumberish,
    fuseFeeMantissa: BigNumberish,
  ) {
    this.baseRatePerBlock = toBN(baseRatePerBlock);
    this.multiplierPerBlock = toBN(multiplierPerBlock);

    this.reserveFactorMantissa = toBN(reserveFactorMantissa);
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(adminFeeMantissa));
    this.reserveFactorMantissa = this.reserveFactorMantissa.add(toBN(fuseFeeMantissa));
    this.initialized = true;
  }

  getBorrowRate(utilizationRate: BigNumber) {
    if (!this.initialized) throw new Error("Interest rate model class not initialized.");
    return utilizationRate.mul(this.multiplierPerBlock).div(toBN(1e18)).add(this.baseRatePerBlock);
  }

  getSupplyRate(utilizationRate: BigNumber) {
    if (!this.initialized) throw new Error("Interest rate model class not initialized.");

    const oneMinusReserveFactor = toBN(1e18).sub(this.reserveFactorMantissa);
    const borrowRate = this.getBorrowRate(utilizationRate);
    const rateToPool = borrowRate.mul(oneMinusReserveFactor).div(toBN(1e18));
    return utilizationRate.mul(rateToPool).div(toBN(1e18));
  }
}
