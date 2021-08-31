import { contracts } from "../contracts/compound-protocol.min.json";
import Fuse from "..";
import { createContract } from "../../../utils/web3";

export default async function deployPool(
  fuse: Fuse,
  poolName: string,
  enforceWhitelist: boolean,
  closeFactor: number,
  maxAssets: number,
  liquidationIncentive: number,
  priceOracle: any,
  priceOracleConf: any,
  options: any,
  whitelist: any,
) {
  // Deploy new price oracle via SDK if requested
  if (Fuse.ORACLES.indexOf(priceOracle) >= 0) {
    try {
      priceOracle = await this.deployPriceOracle(priceOracle, priceOracleConf, options); // TODO: anchorMantissa / anchorPeriod
    } catch (error) {
      throw "Deployment of price oracle failed: " + (error.message ? error.message : error);
    }
  }

  // Deploy Comptroller implementation if necessary
  let implementationAddress = Fuse.COMPTROLLER_IMPLEMENTATION_CONTRACT_ADDRESS;

  if (!implementationAddress) {
    var comptroller = new this.web3.eth.Contract(JSON.parse(contracts["contracts/Comptroller.sol:Comptroller"].abi));
    comptroller = await comptroller
      .deploy({
        data: "0x" + contracts["contracts/Comptroller.sol:Comptroller"].bin,
      })
      .send(options);
    implementationAddress = comptroller.options.address;
  }

  // Register new pool with FusePoolDirectory
  let receipt;
  try {
    receipt = await this.contracts.FusePoolDirectory.methods
      .deployPool(
        poolName,
        implementationAddress,
        enforceWhitelist,
        closeFactor,
        maxAssets,
        liquidationIncentive,
        priceOracle,
      )
      .send(options);
  } catch (error) {
    throw "Deployment and registration of new Fuse pool failed: " + (error.message ? error.message : error);
  }

  // Compute Unitroller address
  const poolAddress = this.getCreate2Address(
    Fuse.FUSE_POOL_DIRECTORY_CONTRACT_ADDRESS,
    [options.from, poolName, receipt.blockNumber],
    this.web3.utils.sha3("0x" + contracts["contracts/Unitroller.sol:Unitroller"].bin),
  );
  var unitroller = createContract(poolAddress, JSON.parse(contracts["contracts/Unitroller.sol:Unitroller"].abi));

  // Accept admin status via Unitroller
  try {
    await unitroller.methods._acceptAdmin().send(options);
  } catch (error) {
    throw "Accepting admin status failed: " + (error.message ? error.message : error);
  }

  // Whitelist
  if (enforceWhitelist) {
    const comptroller = createContract(poolAddress, JSON.parse(contracts["contracts/Comptroller.sol:Comptroller"].abi));

    // Already enforced so now we just need to add the addresses
    await comptroller.methods._setWhitelistStatuses(whitelist, Array(whitelist.length).fill(true)).send(options);
  }

  return [poolAddress, implementationAddress, priceOracle];
}
