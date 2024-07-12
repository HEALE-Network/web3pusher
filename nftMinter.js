const dotenv = require('dotenv');
dotenv.config();

let mintNFT;
let uploadToIPFS;

async function initialize() {
    const { Address, prepareContractCall, sendAndConfirmTransaction, getContract } = await import("thirdweb");
    const { privateKeyToAccount } = await import("thirdweb/wallets");
    const clientModule = await import('./twClient.js');
    const client = clientModule.default;
    const { polygonAmoy } = await import("thirdweb/chains");
    const { ThirdwebSDK } = await import('@thirdweb-dev/sdk');

    const adminAccount = privateKeyToAccount({
        client,
        privateKey: process.env.REACT_APP_ADMIN_WALLET_KEY,
    });

    mintNFT = async (contractAddress, toAddress, tokenId, tokenURI = null) => {
        console.log(`Minting NFT with contractAddress: ${contractAddress}, toAddress: ${toAddress}, tokenId: ${tokenId}, tokenURI: ${tokenURI}`);

        const contract = getContract({
            client,
            chain: polygonAmoy,
            address: contractAddress,
        });

        console.log('Contract obtained:', contract);

        let tx;
        if (tokenURI) {
            tx = await prepareContractCall({
                contract,
                method: "function mintTo(address to, uint256 tokenId, string tokenURI)",
                params: [toAddress, BigInt(tokenId), tokenURI],
            });
        } else {
            tx = await prepareContractCall({
                contract,
                method: "function mintTo(address to, uint256 tokenId)",
                params: [toAddress, BigInt(tokenId)],
            });
        }

        console.log('Transaction prepared:', tx);

        try {
            console.log('Sending transaction:', tx);
            await sendAndConfirmTransaction({
                transaction: tx,
                account: adminAccount,
            });
            console.log(`NFT minted successfully for contract ${contractAddress}, tokenId ${tokenId}`);
        } catch (error) {
            console.error(`Error minting NFT for contract ${contractAddress}, tokenId ${tokenId}:`, error);
        }
    };

    uploadToIPFS = async (metadata) => {
        const sdk = new ThirdwebSDK("polygon", {
            secretKey: process.env.REACT_APP_THREEWEB_SECRET_KEY, // Use your Thirdweb API key here
        });
        try {
            const cid = await sdk.storage.upload(metadata);
            console.log("Metadata uploaded successfully. CID:", cid);
            return cid;
        } catch (error) {
            console.error("Error uploading metadata:", error);
            throw error;
        }
    };

    return { mintNFT, uploadToIPFS };
}

module.exports = initialize;