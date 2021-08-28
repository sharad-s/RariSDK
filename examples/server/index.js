const { testHashes } = require("../../dist");

console.log("Running server");
const { web3Sha3, ethersSha3, sha3Match } = testHashes("hello");
console.log({ web3Sha3, ethersSha3, sha3Match });
