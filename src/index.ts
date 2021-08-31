import Rari from "./rari";
import web3 from "web3";
import { utils } from "ethers";


const testHashes = (input1: string) => {
  const web3SoliditySha3 = web3.utils.soliditySha3(input1);
  const ethersSoliditySha3 = utils.solidityKeccak256(["string"], [input1]);
  const soliditySha3Match = web3SoliditySha3 === ethersSoliditySha3;

  const web3Sha3 = web3.utils.sha3(input1);
  const ethersSha3 = utils.keccak256(utils.id(input1));
  const sha3Match = web3Sha3 === ethersSha3;

  console.log({ soliditySha3Match, sha3Match });

  return { web3SoliditySha3, ethersSoliditySha3, soliditySha3Match, web3Sha3, ethersSha3, sha3Match };
};

export { Rari, testHashes };
