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
// 方便APP打开时调试
// appDebugDiv();

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
      // eslint-disable-next-line no-console
      console.log(`clearWeb3AuthToken 删除: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

// 清理WalletConnect的本地存储 - 增强版
export function clearWalletconnect() {
  // eslint-disable-next-line no-console
  console.log("清理前localStorage键:", Object.keys(localStorage));
  if (typeof localStorage !== "undefined") {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // 匹配更多可能的WalletConnect键名
        const keyLower = key.toLowerCase();
        if (
          keyLower.includes("walletconnect") ||
          keyLower.includes("wc@") || // WalletConnect V2格式
          keyLower.includes("wc-") ||
          key.includes("W3M") || // Web3Modal格式
          key.includes("WALLETCONNECT") ||
          key.includes("wc::") || // 新的命名空间
          key.includes("web3modal") ||
          key.includes("@appkit/") ||  // 添加@appkit相关
          key.includes("onboard")
        ) {
          keysToRemove.push(key);
          // eslint-disable-next-line no-console
          console.log(`🗑️ 标记删除: ${key}`);
        }
      }
    }

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        // eslint-disable-next-line no-console
        console.log(`✅ 已删除: ${key}`);
      });
    } else {
      // eslint-disable-next-line no-console
      console.log("ℹ️ 未找到WalletConnect相关存储");
    }
  }
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

  // 测试序列化
  try {
    const testObj = {chainId: getChainId()};
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
      chainId: getChainId(),
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
  {
    id: "0x5", // Goerli Testnet
    token: "ETH",
    label: "Goerli",
    rpcUrl: "https://goerli.infura.io/v3/9bba525b2b7f4a5581a62399fb4f88a1",
  },
  {
    id: "0x38", // BNB Smart Chain Mainnet 即 0x38==56
    token: "BNB",
    label: "BNB Smart Chain",
    rpcUrl: "https://binance.llamarpc.com",
  },
  {
    id: "0x89", // Polygon Mainnet 137
    token: "MATIC",
    label: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
  },
  {
    id: "0xA4B1", // Arbitrum One 42161
    token: "ETH",
    label: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  {
    id: "0x14a34", // Base Sepolia 测试网，注意：Base 主网是是84532，所以可能是测试网
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
  const dappUrl = `${window.location.origin}`; // 使用当前前端应用的origin
  // eslint-disable-next-line no-console
  console.log("dappUrl:", dappUrl);
  walletConnectFactory = walletConnectModule({
    projectId,
    dappUrl,
    requiredChains: [],
    optionalChains: [1, 5, 56, 137, 42161, 84532],
    qrModalOptions: {
      // 移动端钱包的深度链接
      enableExplorer: true,
      // 可以尝试关闭一些高级UI特性
      themeVariables: {
        "--wcm-z-index": "9999",
      },
      disableProviderPing: true, // 禁止自动连接
      disableAutomaticConnect: true,
      disableSessionAutoconnect: true,
    },
  });
  // eslint-disable-next-line no-console
  console.log("Return type:", typeof walletConnectFactory);
  // 测试工厂函数
  // if (typeof walletConnectFactory === "function") {
  //   const testInstance = walletConnectFactory();
  //   // eslint-disable-next-line no-console
  //   console.log("Test wallet instance:", {
  //     label: testInstance.label,
  //     type: typeof testInstance,
  //     hasGetInterface: typeof testInstance.getInterface === "function",
  //   });
  // }
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
    // console.log("Using wallets:", wallets);
    // eslint-disable-next-line no-console
    console.log("Using chains:", chains);
    // V2版本使用 init 函数
    const web3Onboard = init({
      wallets: wallets,
      chains: chains,
      appMetadata,
      connect: {
        autoConnectLastWallet: false,
        autoConnectAllPreviousWallet: false,
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
        enabled: true,
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
    // 清除本地存储的token
    clearWeb3AuthToken();
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
    console.log("Function entry point");
    const lastkeys = Object.keys(localStorage);
    // 清理登录历史
    clearWeb3AuthToken();
    const onboard = initWeb3Onboard(application, provider);
    if (!onboard) {
      throw new Error("Failed to initialize Web3Onboard");
    }

    // 尝试安全转换
    let wallets = null;
    try {
      // 获取状态和连接钱包
      const state = onboard.state.get();
      if (state.wallets && state.wallets.length > 0) {
        // eslint-disable-next-line no-console
        console.log("发现已连接的钱包，先断开:", state.wallets.map(w => w.label));
        for (const wallet of state.wallets) {
          await onboard.disconnectWallet({label: wallet.label});
        }
      }
      // TODO 临时解决无法断开连接的问题
      // 等待一会确保状态清理完成
      await new Promise(resolve => setTimeout(resolve, 200));
      // eslint-disable-next-line no-console
      console.log("Initial state:", JSON.stringify(state));
      // 显示钱包选择器并连接钱包
      wallets = await onboard.connectWallet();

      for (const key of lastkeys) {
        if (key.includes("appkit/disconnected_connector_ids")) {
          // eslint-disable-next-line no-console
          console.log("connectWallet key:", key);
          if (key.includes("appkit/disconnected_connector_ids") && wallets && wallets.length > 0) {
            // 先移除已连接的钱包
            const wallet = wallets[0];
            // eslint-disable-next-line no-console
            console.log("存在token，先断开， label:", wallet.label);
            await onboard.disconnectWallet({label: wallet.label});
            await new Promise(resolve => setTimeout(resolve, 500));

            // 再次 显示钱包选择器并连接钱包
            wallets = await onboard.connectWallet();
            clearWalletconnect();
            break;
          }
        }
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Conversion failed:", error);
    }

    // eslint-disable-next-line no-console
    console.log("Connected wallets:", wallets);

    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      // eslint-disable-next-line no-console
      console.log("wallet label:", wallet.label);
      const accounts = wallet.accounts;

      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        const address = account.address;
        // eslint-disable-next-line no-console
        console.log("Connected wallet address:", address);
        // 创建认证token
        const token = {
          address: address,
          walletType: wallet.label || wallet.type || "Unknown",
          createAt: Math.floor(new Date().getTime() / 1000),
        };

        setWeb3AuthToken(token);

        // 构建重定向URL
        // 添加随机参数确保不会使用缓存
        const randomId = Math.random().toString(36).substring(7);
        const redirectUri = `${getAuthUrl(application, provider, method)}&web3AuthTokenKey=${getWeb3AuthTokenKey(address)}&nonce=${randomId}`;

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
    // 清除本地存储的token
    clearWeb3AuthToken();
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
export async function disconnectAllWallets(onboard) {
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

function getChainId() {
  if (!window.ethereum) {
    throw new Error("Ethereum provider not found");
  }
  if (!window.ethereum.chainId) {
    throw new Error("Chain ID not available");
  }
  return window.ethereum.chainId;
}

// function appDebugDiv() {
//   // 在文件顶部添加
//   const debugDiv = document.createElement("div");
//   debugDiv.style.position = "fixed";
//   debugDiv.style.bottom = "0";
//   debugDiv.style.right = "0";
//   debugDiv.style.backgroundColor = "rgba(0,0,0,0.7)";
//   debugDiv.style.color = "white";
//   debugDiv.style.fontSize = "12px";
//   debugDiv.style.padding = "20px";
//   debugDiv.style.zIndex = "9999";
//   debugDiv.style.width = "300px";
//   debugDiv.style.height = "200px";
//   debugDiv.style.overflow = "auto";

//   document.body.appendChild(debugDiv);

//   // 替换所有console.log
//   // eslint-disable-next-line no-console
//   const originalConsoleLog = console.log;
//   // eslint-disable-next-line no-console
//   console.log = function(...args) {
//     originalConsoleLog.apply(console, args);
//     debugDiv.innerHTML += args.join(" <br>") + "<br>";
//   };
// }
