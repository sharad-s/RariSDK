import { Contract } from "ethers";

export const createContract = (address: string, abi: any) => new Contract(address, abi);
