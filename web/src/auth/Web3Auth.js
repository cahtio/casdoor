// // Copyright 2023 The Casdoor Authors. All Rights Reserved.
// //
// // Licensed under the Apache License, Version 2.0 (the "License");
// // you may not use this file except in compliance with the License.
// // You may obtain a copy of the License at
// //
// //      http://www.apache.org/licenses/LICENSE-2.0
// //
// // Unless required by applicable law or agreed to in writing, software
// // distributed under the License is distributed on an "AS IS" BASIS,
// // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // See the License for the specific language governing permissions and
// // limitations under the License.
import {goToLink, showMessage} from "../Setting";
import i18next from "i18next";
import {v4 as uuidv4} from "uuid";
import {SignTypedDataVersion, recoverTypedSignature} from "@metamask/eth-sig-util";
import {getAuthUrl} from "./Provider";
import {Buffer} from "buffer";

// Web3Onboard V2 导入
// import injectedModule from "@web3-onboard/injected-wallets";
// import {init} from "@web3-onboard/react";
import init from "@web3-onboard/core";
import walletConnectModule from "@web3-onboard/walletconnect";
// import coinbaseWalletModule from "@web3-onboard/coinbase";
// import phantomModule from "@web3-onboard/phantom";
// import trustModule from "@web3-onboard/trust";
// import frontierModule from "@web3-onboard/frontier";
// import tahoModule from "@web3-onboard/taho";
// import gnosisModule from "@web3-onboard/gnosis";
// import sequenceModule from "@web3-onboard/sequence";
// import infinityWalletModule from "@web3-onboard/infinity-wallet";
import "core-js/features/bigint";
import "core-js/features/number";

// 为Buffer设置全局变量
global.Buffer = Buffer;

// 添加安全的BigInt处理函数
export function safeBigIntToNumber(value) {
  if (typeof value === "bigint") {
    // 检查是否在安全整数范围内
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
      throw new Error(`BigInt value ${value} is outside safe integer range`);
    }
    return Number(value);
  }
  return value;
}

export function safeBigIntToString(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export function generateNonce() {
  const nonce = uuidv4();
  return nonce;
}

export function getWeb3AuthTokenKey(address) {
  return `Web3AuthToken_${address}`;
}

export function setWeb3AuthToken(token) {
  const key = getWeb3AuthTokenKey(token.address);
  localStorage.setItem(key, JSON.stringify(token));
}

export function getWeb3AuthToken(address) {
  const key = getWeb3AuthTokenKey(address);
  return JSON.parse(localStorage.getItem(key));
}

export function delWeb3AuthToken(address) {
  const key = getWeb3AuthTokenKey(address);
  localStorage.removeItem(key);
}

export function clearWeb3AuthToken() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith("Web3AuthToken_")) {
      localStorage.removeItem(key);
    }
  });
}

export function detectMetaMaskPlugin() {
  return window.ethereum && window.ethereum.isMetaMask;
}

export function requestEthereumAccount() {
  const method = "eth_requestAccounts";
  const selectedAccount = window.ethereum.request({method})
    .then((accounts) => {
      return accounts[0];
    });
  return selectedAccount;
}

export function signEthereumTypedData(from, nonce) {
  // 详细检查 chainId 类型
  // eslint-disable-next-line no-console
  console.log("🔍 signEthereumTypedData - chainId details:", {
    chainId: window.ethereum.chainId,
    type: typeof window.ethereum.chainId,
    isBigInt: typeof window.ethereum.chainId === "bigint",
    isString: typeof window.ethereum.chainId === "string",
    isNumber: typeof window.ethereum.chainId === "number",
    valueOf: window.ethereum.chainId?.valueOf?.(),
    toString: window.ethereum.chainId?.toString?.(),
    hex: window.ethereum.chainId?.toString(16),
    decimal: window.ethereum.chainId?.toString(10),
  });

  // 测试序列化
  try {
    const testObj = {chainId: window.ethereum.chainId};
    const testJson = JSON.stringify(testObj);
    // eslint-disable-next-line no-console
    console.log("✅ chainId JSON serialization test passed:", testJson);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ chainId JSON serialization failed:", err.message);
  }

  // https://docs.metamask.io/wallet/how-to/sign-data/
  const date = new Date();
  const typedData = JSON.stringify({
    domain: {
      chainId: window.ethereum.chainId,
      name: "Casdoor",
      version: "1",
    },
    message: {
      prompt: "In order to authenticate to this website, sign this request and your public address will be sent to the server in a verifiable way.",
      nonce: nonce,
      createAt: `${date.toLocaleString()}`,
    },
    primaryType: "AuthRequest",
    types: {
      EIP712Domain: [
        {name: "name", type: "string"},
        {name: "version", type: "string"},
        {name: "chainId", type: "uint256"},
      ],
      AuthRequest: [
        {name: "prompt", type: "string"},
        {name: "nonce", type: "string"},
        {name: "createAt", type: "string"},
      ],
    },
  });

  const method = "eth_signTypedData_v4";
  const params = [from, typedData];

  return window.ethereum.request({method, params})
    .then((sign) => {
      return {
        address: from,
        createAt: Math.floor(date.getTime() / 1000),
        typedData: typedData,
        signature: sign,
      };
    });
}

export function checkEthereumSignedTypedData(token) {
  if (token === undefined || token === null) {
    return false;
  }
  if (token.address && token.typedData && token.signature) {
    const recoveredAddr = recoverTypedSignature({
      data: JSON.parse(token.typedData),
      signature: token.signature,
      version: SignTypedDataVersion.V4,
    });
    return recoveredAddr === token.address;
  }
  return false;
}

export async function authViaMetaMask(application, provider, method) {
  if (!detectMetaMaskPlugin()) {
    showMessage("error", `${i18next.t("login:MetaMask plugin not detected")}`);
    return;
  }
  try {
    const account = await requestEthereumAccount();
    let token = getWeb3AuthToken(account);
    if (!checkEthereumSignedTypedData(token)) {
      const nonce = generateNonce();
      token = await signEthereumTypedData(account, nonce);
      setWeb3AuthToken(token);
    }
    const redirectUri = `${getAuthUrl(application, provider, method)}&web3AuthTokenKey=${getWeb3AuthTokenKey(account)}`;
    goToLink(redirectUri);
  } catch (err) {
    showMessage("error", `${i18next.t("login:Failed to obtain MetaMask authorization")}: ${err.message}`);
  }
}

// Web3Onboard V2 配置
// 链配置 - 使用数字类型ID
const chains = [
  {
    id: "0x1",
    token: "ETH",
    label: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/9bba525b2b7f4a5581a62399fb4f88a1",
  },
  // {
  //   id: 5, // Goerli Testnet
  //   token: "ETH",
  //   label: "Goerli",
  //   rpcUrl: "https://goerli.infura.io/v3/9bba525b2b7f4a5581a62399fb4f88a1",
  // },
  // {
  //   id: 56, // BNB Smart Chain Mainnet (注意：38不是标准BNB链ID，标准的应该是56)
  //   token: "BNB",
  //   label: "BNB Smart Chain",
  //   rpcUrl: "https://bsc-dataseed.binance.org/",
  // },
  // {
  //   id: 137, // Polygon Mainnet
  //   token: "MATIC",
  //   label: "Polygon",
  //   rpcUrl: "https://polygon-rpc.com",
  // },
  // {
  //   id: 42161, // Arbitrum One
  //   token: "ETH",
  //   label: "Arbitrum",
  //   rpcUrl: "https://arb1.arbitrum.io/rpc",
  // },
  {
    id: "0x14a34", // Base Sepolia 测试网，注意：Base 主网是8453，但日志中是84532，所以可能是测试网
    token: "ETH",
    label: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
  },
];

// 应用元数据
const appMetadata = {
  name: "Caht",
  description: "Connect a wallet using Caht",
  explore: String(window.location.origin),
  recommendedInjectedWallets: [
    {name: "MetaMask", url: "https://metamask.io"},
    {name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet"},
    {name: "Phantom", url: "https://phantom.app"},
  ],
};

let walletConnectFactory = null;
try {
  const projectId = "7dc04403c5c9668060ca6f64abab2c71";
  const dappUrl = "https://oauth.caht.io"; // 使用当前前端应用的origin

  walletConnectFactory = walletConnectModule({
    projectId,
    dappUrl,
    requiredChains: [1],
    // optionalChains: ["0x14a34"],
    // optionalChains: [5, 56],
    qrModalOptions: {
      // 移动端钱包的深度链接
      enableExplorer: true,
      // 可以尝试关闭一些高级UI特性
      themeVariables: {
        "--wcm-z-index": "9999",
      },
    },
  });
  // eslint-disable-next-line no-console
  console.log("Return type:", typeof walletConnectFactory);
  // 测试工厂函数
  if (typeof walletConnectFactory === "function") {
    const testInstance = walletConnectFactory();
    // eslint-disable-next-line no-console
    console.log("Test wallet instance:", {
      label: testInstance.label,
      type: typeof testInstance,
      hasGetInterface: typeof testInstance.getInterface === "function",
    });
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("walletConnectModule error:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  showMessage("error", `${i18next.t("login:Failed to obtain Web3-Onboard authorization")}: ${err.message}`);
}

// 钱包模块配置
const walletModules = {
  // "injected": injectedModule(),
  "walletConnect": walletConnectFactory,
//   "coinbase": coinbaseWalletModule({darkMode: true}),
//   "phantom": phantomModule(),
//   "trust": trustModule(),
//   "frontier": frontierModule(),
//   "taho": tahoModule(),
//   "gnosis": gnosisModule(),
//   "sequence": sequenceModule(),
//   "infinityWallet": infinityWalletModule(),
};

// eslint-disable-next-line no-console
console.log("WalletConnect module type:", typeof walletModules["walletConnect"]);

// 获取可用的钱包选项 - 动态生成，只显示实际可用的模块
export function getWeb3OnboardWalletsOptions() {
  return Object.entries(walletModules)
    .filter(([key, module]) => {
      // 过滤条件：
      // 3. 如果是函数，确保它是有效的（walletConnectFactory）
      if (!module) {return false;}
      return true;
    })
    .map(([key, module]) => {
      // 根据模块类型生成显示标签
      let label = key.charAt(0).toUpperCase() + key.slice(1);

      // 如果模块是函数，可以尝试获取更多信息
      if (typeof module === "function") {
        try {
          const instance = module();
          if (instance && instance.label) {
            label = instance.label;
          }
        } catch (e) {
          // 如果调用失败，使用默认标签
          // eslint-disable-next-line no-console
          console.warn(`Failed to get label for ${key}:`, e.message);
        }
      }

      return {
        label,
        value: key,
        type: typeof module,
        disabled: !module, // 如果模块不可用，禁用选项
      };
    });
}

// 修改 getWeb3OnboardWallets 函数，只返回可用的模块
function getWeb3OnboardWallets(options) {
  if (!options || !Array.isArray(options) || options.length === 0) {
    // eslint-disable-next-line no-console
    console.log("getWeb3OnboardWallets: options is empty or invalid");
    // 使用默认的 walletConnect
    const defaultWallet = walletModules["walletConnect"];
    if (defaultWallet && typeof defaultWallet === "function") {
      // eslint-disable-next-line no-console
      console.log("Using default walletConnect");
      return [defaultWallet];
    }
    // eslint-disable-next-line no-console
    console.log("getWeb3OnboardWallets: No valid wallet modules found");
    return [];
  }

  // eslint-disable-next-line no-console
  console.log("Requested wallet types:", options);
  // eslint-disable-next-line no-console
  console.log("Available wallet modules:", Object.keys(walletModules));

  // 过滤掉不可用的选项
  const availableOptions = options.filter(option =>
    walletModules[option] && typeof walletModules[option] === "function"
  );

  if (availableOptions.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("None of the requested wallet types are available, falling back to walletConnect");
    const fallback = walletModules["walletConnect"];
    return fallback && typeof fallback === "function" ? [fallback] : [];
  }

  return availableOptions
    .map(walletType => walletModules[walletType]) // 直接取值，不调用
    .filter(module => typeof module === "function");
}

// 初始化Web3Onboard
export function initWeb3Onboard(application, provider) {
  // eslint-disable-next-line no-console
  console.log(`initWeb3Onboard: application=, provider=${JSON.stringify(provider)}`);

  try {
    // 解析钱包选项
    const options = JSON.parse(provider.metadata);
    const wallets = getWeb3OnboardWallets(options);

    // 检查是否有可用的钱包
    if (wallets.length === 0) {
      throw new Error("No valid wallet modules found");
    }
    // eslint-disable-next-line no-console
    console.log("Using wallets:", wallets);
    // eslint-disable-next-line no-console
    console.log("Using chains:", chains);
    // V2版本使用 init 函数
    const web3Onboard = init({
      wallets: wallets,
      chains: chains,
      appMetadata,
      connect: {
        autoConnectLastWallet: false,
        removeWhereIsMyWalletWarning: true,
        showSidebar: true,
      },
      accountCenter: {
        desktop: {
          enabled: false,
        },
        mobile: {
          enabled: false,
        },
      },
      notify: {
        enabled: false,
        transactionHandler: () => {
          // 空函数避免弃用警告
        },
      },
      theme: "dark",
    });

    // eslint-disable-next-line no-console
    console.log("Web3Onboard initialized:", web3Onboard);
    return web3Onboard;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("initWeb3Onboard error:", err);
    showMessage("error", `Failed to initialize Web3Onboard: ${err.message}`);
    return null;
  }
}

// 通过Web3Onboard进行认证
export async function authViaWeb3Onboard(application, provider, method) {
  try {
    // eslint-disable-next-line no-console
    console.trace("Function entry point");
    // eslint-disable-next-line no-console
    console.log("chainId type check1:", {
      value: window.ethereum.chainId,
      type: typeof window.ethereum.chainId,
      isBigInt: typeof window.ethereum.chainId === "bigint",
    });
    const onboard = initWeb3Onboard(application, provider);

    if (!onboard) {
      throw new Error("Failed to initialize Web3Onboard");
    }

    // eslint-disable-next-line no-console
    console.log("chainId type check2:", {
      value: window.ethereum.chainId,
      type: typeof window.ethereum.chainId,
      isBigInt: typeof window.ethereum.chainId === "bigint",
    });
    // 尝试安全转换
    let wallets = null;
    try {
      // 获取状态和连接钱包
      const state = onboard.state.get();
      // eslint-disable-next-line no-console
      console.log("Initial state:", state);

      // 显示钱包选择器并连接钱包
      wallets = await onboard.connectWallet();
      const test = Number(window.ethereum.chainId);
      // eslint-disable-next-line no-console
      console.log("Safe conversion successful:", test);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Conversion failed:", error);
    }

    // eslint-disable-next-line no-console
    console.log("Connected wallets:", wallets);

    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      const accounts = wallet.accounts;

      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        const address = account.address;

        // 创建认证token
        const token = {
          address: address,
          walletType: wallet.label || wallet.type || "Unknown",
          createAt: Math.floor(new Date().getTime() / 1000),
        };

        setWeb3AuthToken(token);

        // 构建重定向URL
        const redirectUri = `${getAuthUrl(application, provider, method)}&web3AuthTokenKey=${getWeb3AuthTokenKey(address)}`;

        // eslint-disable-next-line no-console
        console.log("Redirecting to:", redirectUri);
        goToLink(redirectUri);

        return true;
      } else {
        throw new Error("No accounts found in connected wallet");
      }
    } else {
      throw new Error("No wallet connected");
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("authViaWeb3Onboard error:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    showMessage("error", `${i18next.t("login:Failed to obtain Web3-Onboard authorization")}: ${err.message}`);
    return false;
  }
}

// 获取当前连接的钱包
export async function getConnectedWallets() {
  const onboard = initWeb3Onboard();
  if (!onboard) {return [];}

  const state = onboard.state.get();
  return state.wallets || [];
}

// 断开所有钱包连接
export async function disconnectAllWallets() {
  const onboard = initWeb3Onboard();
  if (!onboard) {return;}

  const {wallets} = onboard.state.get();

  if (wallets && wallets.length > 0) {
    for (const wallet of wallets) {
      await onboard.disconnectWallet({label: wallet.label});
    }
  }

  // 清除本地存储的token
  clearWeb3AuthToken();
}

// 添加链ID转换辅助函数
export function convertChainIdToNumber(chainId) {
  if (typeof chainId === "number") {
    return chainId;
  }
  if (typeof chainId === "string") {
    if (chainId.startsWith("0x")) {
      return parseInt(chainId, 16);
    }
    return parseInt(chainId, 10);
  }
  if (typeof chainId === "bigint") {
    // 检查是否在安全范围内
    if (chainId > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Chain ID ${chainId} is too large for safe conversion`);
    }
    return Number(chainId);
  }
  throw new Error(`Invalid chainId type: ${typeof chainId}`);
}

// 设置链
export async function setChain(chainId) {
  const onboard = initWeb3Onboard();
  if (!onboard) {return false;}

  try {
    // 确保chainId是数字类型
    const numericChainId = convertChainIdToNumber(chainId);
    await onboard.setChain({chainId: numericChainId});
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to set chain:", err.message);
    return false;
  }
}
