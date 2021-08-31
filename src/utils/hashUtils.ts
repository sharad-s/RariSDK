import { utils } from "ethers";

export const computeSoliditySha3 = (input1: string) => utils.solidityKeccak256(["string"], [input1]);
export const computeSoliditySha3Multiple = (inputs: any[]) => utils.solidityKeccak256(...inputs);
