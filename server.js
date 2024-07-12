const dotenv = require('dotenv');
dotenv.config();
const pusher = require('./pusherClient.js');
const initializeNFTMinter = require("./nftMinter.js");

(async () => {
    const { useConnect, useSendTransaction, useSetActiveWallet } = await import("thirdweb/react");
    const { inAppWallet, privateKeyToAccount, createWallet } = await import("thirdweb/wallets");
    const clientModule = await import("./twClient.js");
    const client = clientModule.default;
    const { polygonAmoy } = await import("thirdweb/chains");
    const { Address, prepareContractCall, sendAndConfirmTransaction, getContract } = await import("thirdweb");

    const { mintNFT, uploadToIPFS } = await initializeNFTMinter();

    // Verify that mintNFT and uploadToIPFS are imported correctly
    console.log('mintNFT function:', mintNFT);
    console.log('uploadToIPFS function:', uploadToIPFS);

    // Subscribe to the 'transactions' channel
    const txchannel = pusher.subscribe('transactions');
    txchannel.bind('pusher:subscription_succeeded', () => {
        console.log('Subscribed to transactions channel');
    });

    txchannel.bind('App\\Events\\TransactionUpdated', async (data) => {
        console.log('TransactionUpdated:', data);
        const tokenId = data.data.id;
        console.log(tokenId);
        const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS_T;
        console.log(contractAddress);
        const toAddress = "0xBAcC0DB3ae0d224545465e27260480cC481092A8"; // Replace with the actual recipient address

        try {
            console.log(`Calling mintNFT with contractAddress: ${contractAddress}, toAddress: ${toAddress}, tokenId: ${tokenId}`);
            await mintNFT(contractAddress, toAddress, tokenId);
            console.log('NFT minted successfully');
        } catch (error) {
            console.error(`Error minting NFT for transaction`, error);
        }
    });

    // Subscribe to the 'shipments' channel
    const shipmentchannel = pusher.subscribe('shipments');
    shipmentchannel.bind('pusher:subscription_succeeded', () => {
        console.log('Subscribed to shipments channel');
    });

    shipmentchannel.bind('App\\Events\\ShipmentAdded', async (data) => {
        console.log('ShipmentAdded:', data);
        const shipmentData = data.data;
        const metadata = {
            transaction_id: shipmentData.transaction_id,
            mode_type: shipmentData.mode_type,
            shipment_type: shipmentData.load_type
        };

        try {
            const cid = await uploadToIPFS(metadata);
            const tokenURI = cid;
            const tokenId = shipmentData.id;
            const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS_S;
            const toAddress = "0xBAcC0DB3ae0d224545465e27260480cC481092A8"; // Replace with the actual recipient address

            console.log(`Calling mintNFT with contractAddress: ${contractAddress}, toAddress: ${toAddress}, tokenId: ${tokenId}, tokenURI: ${tokenURI}`);
            await mintNFT(contractAddress, toAddress, tokenId, tokenURI);
            console.log('NFT minted successfully for shipment');
        } catch (error) {
            console.error(`Error minting NFT for shipment`, error);
        }
    });

    // Subscribe to the 'shipment-invoices' channel
    const invoicechannel = pusher.subscribe('shipment-invoices');
    invoicechannel.bind('pusher:subscription_succeeded', () => {
        console.log('Subscribed to invoices channel');
    });

    invoicechannel.bind('App\\Events\\ShipmentInvoiceCreated', async (data) => {
        console.log('ShipmentInvoiceCreated:', data);
        const invoiceData = data.data;
        const metadata = {
            status: invoiceData.status,
            invoice_date: invoiceData.invoice_date,
            due_date: invoiceData.due_date
        };

        try {
            const cid = await uploadToIPFS(metadata);
            const tokenURI = cid;
            const tokenId = invoiceData.id;
            const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS_I;
            const toAddress = "0xBAcC0DB3ae0d224545465e27260480cC481092A8"; // Replace with the actual recipient address

            console.log(`Calling mintNFT with contractAddress: ${contractAddress}, toAddress: ${toAddress}, tokenId: ${tokenId}, tokenURI: ${tokenURI}`);
            await mintNFT(contractAddress, toAddress, tokenId, tokenURI);
            console.log('NFT minted successfully for invoice');
        } catch (error) {
            console.error(`Error minting NFT for invoice`, error);
        }
    });

    // To gracefully handle shutdowns
    process.on('SIGINT', () => {
        console.log('Shutting down...');
        txchannel.unbind_all();
        txchannel.unsubscribe();
        shipmentchannel.unbind_all();
        shipmentchannel.unsubscribe();
        invoicechannel.unbind_all();
        invoicechannel.unsubscribe();
        process.exit();
    });
})();