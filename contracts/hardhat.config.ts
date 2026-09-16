import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

export default defineConfig({
  plugins: [hardhatToolboxViem],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // Local Hardhat node. Start with `npx hardhat node` and deploy with
    // `npm run deploy:local`. Automated tests run against this chain.
    localhost: {
      type: "http",
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
    // Polygon Amoy testnet. Hardhat already ships a chain descriptor for
    // 80002 (name + PolygonScan explorer), so no chainDescriptors override
    // is needed here.
    amoy: {
      type: "http",
      chainId: 80002,
      url: configVariable("AMOY_RPC_URL"),
      accounts: [configVariable("AMOY_PRIVATE_KEY")],
    },
  },

  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
