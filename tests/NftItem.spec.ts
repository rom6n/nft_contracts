import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { NftItem } from '../wrappers/NftItem';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('NftItem', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('NftItem');
    });

    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let nftItem: SandboxContract<NftItem>;
    let collectionAddress: SandboxContract<TreasuryContract>;
    let content: Cell;
    let sender: SandboxContract<TreasuryContract>;
    let receiver: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        collectionAddress = await blockchain.treasury('collection');
        owner = await blockchain.treasury('deployer');
        content = beginCell().storeStringTail('nft-1.json').endCell();
        sender = await blockchain.treasury('sender');
        receiver = await blockchain.treasury('receiver');

        nftItem = blockchain.openContract(
            NftItem.createFromConfig(
                {
                    index: 1,
                    collection_address: collectionAddress.address,
                    owner_address: owner.address,
                    content: content,
                },
                code,
            ),
        );

        const deployResult = await nftItem.sendDeploy(collectionAddress.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: collectionAddress.address,
            to: nftItem.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and nftItem are ready to use
    });

    it('should send_ownership successfully var:1', async () => {
        const ownershipResult = await nftItem.sendTransferOwnership(
            owner.getSender(),
            toNano('1'),
            receiver.address,
            owner.address, // response destination with rest amount TON
        );
        expect(ownershipResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftItem.address,
            success: true,
        });

        const nftData = await nftItem.getNftData();
        expect(nftData.ownerAddress.toString({ testOnly: true })).toBe(receiver.address.toString({ testOnly: true }));
    });
    it('should send_ownership successfully var:2', async () => {
        const ownershipResult = await nftItem.sendTransferOwnership(
            owner.getSender(),
            toNano('1'),
            receiver.address,
            owner.address, // response destination with rest amount TON
            'Hello from test'.toString(), // forward message
            toNano(0.05), // forward amount
        );
        expect(ownershipResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftItem.address,
            success: true,
        });

        const nftData = await nftItem.getNftData();
        expect(nftData.ownerAddress.toString({ testOnly: true })).toBe(receiver.address.toString({ testOnly: true }));
    });
    it('should NOT send_ownership due not from owner var:1', async () => {
        const ownershipResult = await nftItem.sendTransferOwnership(
            sender.getSender(), // !!! fail reason !!!
            toNano('1'),
            receiver.address,
            owner.address,
        );
        expect(ownershipResult.transactions).toHaveTransaction({
            from: sender.address,
            to: nftItem.address,
            success: false,
            exitCode: 401,
        });
    });
    it('should NOT send_ownership due not from owner var:2', async () => {
        const ownershipResult = await nftItem.sendTransferOwnership(
            sender.getSender(), // !!! fail reason !!!
            toNano('1'),
            receiver.address,
            owner.address,
            'Hello from test'.toString(),
            toNano(0.05),
        );
        expect(ownershipResult.transactions).toHaveTransaction({
            from: sender.address,
            to: nftItem.address,
            success: false,
            exitCode: 401,
        });
    });
    it('should NOT send_ownership due not enough balance var:2', async () => {
        const ownershipResult = await nftItem.sendTransferOwnership(
            owner.getSender(),
            toNano('1'),
            receiver.address,
            owner.address,
            'Hello from test'.toString(),
            toNano(5), // !!! fail reason !!!
        );
        expect(ownershipResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftItem.address,
            success: false,
            exitCode: 402,
        });
    });
});
