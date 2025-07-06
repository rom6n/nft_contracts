import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, fromNano, toNano } from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { todo } from 'node:test';

describe('FixedSale', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('FixedSale');
    });

    let blockchain: Blockchain;
    let marketplace_address: SandboxContract<TreasuryContract>;
    let nft_address: SandboxContract<TreasuryContract>;
    let owner_address: SandboxContract<TreasuryContract>;
    let royalty_address: SandboxContract<TreasuryContract>;
    let fixedSale: SandboxContract<FixedSale>;
    let buyer: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        nft_address = await blockchain.treasury('nft');
        owner_address = await blockchain.treasury('owner');
        marketplace_address = await blockchain.treasury('marketplace');
        royalty_address = await blockchain.treasury('royalty');
        buyer = await blockchain.treasury('buyer');

        fixedSale = blockchain.openContract(
            FixedSale.createFromConfig(
                {
                    is_completed: 0,
                    created_at: Math.floor(Date.now() / 1000), // Current timestamp in seconds
                    marketplace_address: marketplace_address.address,
                    nft_address: nft_address.address,
                    nft_owner_address: undefined,
                    full_price: toNano('1.0'), // Set the full price for the sale
                    marketplace_fee_address: marketplace_address.address,
                    marketplace_fee: toNano('0.03'), // Set the marketplace fee
                    royalty_address: royalty_address.address,
                    royalty_amount: toNano('0.04'), // Set the royalty amount
                    sold_at: 0, // Initially not sold
                    query_id: BigInt(0), // Initial query ID
                },
                code,
            ),
        );

        const deployResult = await fixedSale.sendDeploy(marketplace_address.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and fixedSale are ready to use
    });

    it('should successfully send emergency message', async () => {
        const messageResult = await fixedSale.sendEmergencyMessage(
            marketplace_address.getSender(),
            toNano('0.1'),
            owner_address.address,
            toNano('0.05'),
            0,
            BigInt(1452563),
        );

        expect(messageResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            success: true,
        });
    });
    it('should NOT send emergency message due not from market', async () => {
        const messageResult = await fixedSale.sendEmergencyMessage(
            owner_address.getSender(),
            toNano('0.1'),
            owner_address.address,
            toNano('0.05'),
            0,
            BigInt(1452563),
        );

        expect(messageResult.transactions).toHaveTransaction({
            from: owner_address.address,
            to: fixedSale.address,
            success: false,
        });
    });
    it('should UNsuccessfully send emergency message due wrong mode', async () => {
        const messageResult = await fixedSale.sendEmergencyMessage(
            marketplace_address.getSender(),
            toNano('0.1'),
            owner_address.address,
            toNano('0.05'),
            32,
            BigInt(1452563),
        );

        expect(messageResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 405,
        });
    });
    it('should UNsuccessfully send emergency message due 10min buffer', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const buyResult = await fixedSale.sendBuy(buyer.getSender(), toNano('1.07'));
        expect(buyResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: fixedSale.address,
            success: true,
        });

        const messageResult = await fixedSale.sendEmergencyMessage(
            marketplace_address.getSender(),
            toNano('0.1'),
            owner_address.address,
            toNano('0.05'),
            0,
            BigInt(1452563),
        );

        expect(messageResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 406,
        });
    });

    it('should successfully transfer NFT', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.nft_owner_address.toString({ testOnly: true })).toBe(
            owner_address.address.toString({ testOnly: true }),
        );
        const saleData = await fixedSale.getSaleData();
        console.log(`Sale ID: ${saleData.ID}\nis_completed: ${saleData.is_completed}`);
    });
    it('should UNsuccessfully transfer NFT due not from NFT address', async () => {
        const transferResult = await fixedSale.sendNft(
            owner_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: owner_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 500,
        });
        //const dataAfter = await fixedSale.getFixPriceData();
        //expect(dataAfter.nft_owner_address.toString({ testOnly: true })).toBe( // должен выдать ошибку, т.к. не должен менять владельца
        //owner_address.address.toString({ testOnly: true }),
        //);
    });
    it('should UNsuccessfully transfer NFT due wrong opcode', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            5,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 501,
        });
    });
    it('should UNsuccesssfully transfer NFT due sell already completed', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const buyResult = await fixedSale.sendBuy(buyer.getSender(), toNano('1.07'));
        expect(buyResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: fixedSale.address,
            success: true,
        });

        const transferResult2 = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult2.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 404,
        });
    });

    it('should successfully cancel sale', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });
        const dataBefore = await fixedSale.getFixPriceData();
        expect(dataBefore.is_completed).toBe(false);

        const cancelResult = await fixedSale.sendCancelSale(marketplace_address.getSender(), toNano('0.05'));
        expect(cancelResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            success: true,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.is_completed).toBe(true);
    });
    it('should UNsuccessfully cancel sale due not from owner or market', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const cancelResult = await fixedSale.sendCancelSale(nft_address.getSender(), toNano('0.05'));
        expect(cancelResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 458,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.is_completed).toBe(false);
    });
    it('should UNsuccessfully cancel sale due not enough TON', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const cancelResult = await fixedSale.sendCancelSale(nft_address.getSender(), toNano('0.04'));
        expect(cancelResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 457,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.is_completed).toBe(false);
    });

    it('should successfully buy', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });
        const dataBefore = await fixedSale.getFixPriceData();
        console.log('balance before buy:', fromNano(dataBefore.balance.toString()));

        const buyResult = await fixedSale.sendBuy(buyer.getSender(), toNano('1.07'));
        expect(buyResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: fixedSale.address,
            success: true,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.is_completed).toBe(true);
        expect(dataAfter.sold_at).toBeGreaterThan(0);
        console.log('balance after buy:', fromNano(dataAfter.balance.toString()));
    });
    it('should UNsuccessfully buy due not enough TON', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const buyResult = await fixedSale.sendBuy(buyer.getSender(), toNano('1.0'));
        expect(buyResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: fixedSale.address,
            success: false,
            exitCode: 450,
        });
    });

    it('should successfully deposit', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const dataBefore = await fixedSale.getFixPriceData();
        console.log('balance before deposit:', fromNano(dataBefore.balance.toString()));

        const depositResult = await fixedSale.sendDeposit(owner_address.getSender(), toNano('0.1'), BigInt(459632));
        expect(depositResult.transactions).toHaveTransaction({
            from: owner_address.address,
            to: fixedSale.address,
            success: true,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        console.log('balance after deposit:', fromNano(dataAfter.balance.toString()));
    });

    it('should successfully change data', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const dataBefore = await fixedSale.getFixPriceData();

        const changeResult = await fixedSale.sendChangeSaleData(
            marketplace_address.getSender(),
            toNano('0.05'),
            toNano('2'),
            toNano('0.64'),
            toNano('0.2'),
            BigInt(898245),
        );
        expect(changeResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            success: true,
        });

        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.full_price).toBeGreaterThan(dataBefore.full_price);
        console.log(`
            full_price before change: ${fromNano(dataBefore.full_price.toString())}\n
            full_price after change: ${fromNano(dataAfter.full_price.toString())}
            marketplace_fee before change: ${fromNano(dataBefore.marketplace_fee.toString())}\n
            marketplace_fee after change: ${fromNano(dataAfter.marketplace_fee.toString())}
            royalty_amount before change: ${fromNano(dataBefore.royalty_amount.toString())}\n
            royalty_amount after change: ${fromNano(dataAfter.royalty_amount.toString())}
        `);
    });
    it('should UNsuccessfully change data due low profit', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const dataBefore = await fixedSale.getFixPriceData();

        const changeResult = await fixedSale.sendChangeSaleData(
            marketplace_address.getSender(),
            toNano('0.05'),
            toNano('0.03'),
            toNano('0.015'),
            toNano('0.01'),
            BigInt(898245),
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            success: false,
            exitCode: 408,
        });
        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.full_price).toBe(dataBefore.full_price);
    });
    it('should UNsuccessfully change data due not from owner or market', async () => {
        const transferResult = await fixedSale.sendNft(
            nft_address.getSender(),
            toNano('0.05'),
            owner_address.address,
            0x05138d91,
        );
        expect(transferResult.transactions).toHaveTransaction({
            from: nft_address.address,
            to: fixedSale.address,
            success: true,
        });

        const dataBefore = await fixedSale.getFixPriceData();

        const changeResult = await fixedSale.sendChangeSaleData(
            buyer.getSender(),
            toNano('0.05'),
            toNano('2'),
            toNano('0.64'), // маркетплейс может менять все значения, включая market fee и royalty amount, владелец может менять только full_price
            toNano('0.2'),
            BigInt(898245),
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: fixedSale.address,
            success: false,
            exitCode: 0xffff,
        });

        const dataAfter = await fixedSale.getFixPriceData();
        expect(dataAfter.full_price).toBe(dataBefore.full_price);
    });
});
