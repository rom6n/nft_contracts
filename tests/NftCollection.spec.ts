import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import '@ton/test-utils';
import { NftItem } from '../wrappers/NftItem';
import { compile } from '@ton/blueprint';

describe('NftCollection', () => {
    let code: Cell;
    let nft_item_code: Cell;

    beforeAll(async () => {
        code = await compile('NftCollection');
        nft_item_code = await compile('NftItem');
    });

    let blockchain: Blockchain;
    let editor: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;
    let owner: SandboxContract<TreasuryContract>;
    let sender: SandboxContract<TreasuryContract>;
    let content: Cell;
    let royalty_params: Cell;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        sender = await blockchain.treasury('sender');
        editor = await blockchain.treasury('editor');
        const common_content = beginCell().storeStringTail('https://mysite.com/nft-content/').endCell();
        const collection_content = beginCell()
            .storeStringTail('https://mysite.com/nft-collection-content/11234.json')
            .endCell();
        content = beginCell().storeRef(collection_content).storeRef(common_content).endCell();
        royalty_params = beginCell().storeUint(30, 16).storeUint(1000, 16).storeAddress(owner.address).endCell(); // comission to owner 3% (user that created collection)

        nftCollection = blockchain.openContract(
            NftCollection.createFromConfig(
                {
                    owner_address: owner.address,
                    next_item_index: 1,
                    content,
                    nft_item_code,
                    royalty_params,
                    editor_address: editor.address,
                },
                code,
            ),
        );

        const deployResult = await nftCollection.sendDeploy(owner.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and nftCollection are ready to use
    });

    it('should successfully deploy NFT', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployNft(
            owner.getSender(),
            toNano('0.15'),
            1,
            toNano('0.12'),
            nft_content,
            32052,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });
    });
    it('should UNsuccessfully deploy NFT due not from owner', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployNft(
            sender.getSender(),
            toNano('0.15'),
            1,
            toNano('0.12'),
            nft_content,
            67430,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: sender.address,
            to: nftCollection.address,
            success: false,
            exitCode: 401,
        });
    });
    it('should UNsuccessfully deploy due wrong item index NFT', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployNft(
            owner.getSender(),
            toNano(0.05),
            2,
            toNano(0.02),
            nft_content,
            49251,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 402,
        });
    });
    it('should UNsuccessfully deploy due not enough balance NFT', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployNft(
            owner.getSender(),
            toNano('0.15'),
            1,
            toNano('1'),
            nft_content,
            98453,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 700,
        });
    });

    it('should successfully deploy batch NFT (1nft)', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployBatchNft(
            owner.getSender(),
            toNano('0.15'), // TON for collection
            1,
            1,
            nft_content,
            toNano('0.12'), // TON for nft item
            34503,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });
    });
    it('should successfully deploy batch NFT (100nft)', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05')) // forward message to someone from nft item
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployBatchNft(
            owner.getSender(),
            toNano('30'), // TON for collection
            1,
            99,
            nft_content,
            toNano('0.12'), // TON for each nft item
            23552,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });
    });
    it('should UNsuccessfully deploy batch NFT due not from owner (100nft)', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployBatchNft(
            sender.getSender(),
            toNano('15'),
            1,
            99,
            nft_content,
            toNano('0.12'),
            23552,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: sender.address,
            to: nftCollection.address,
            success: false,
            exitCode: 401,
        });
    });
    it('should UNsuccessfully deploy batch NFT due not enough balance (1nft)', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployBatchNft(
            owner.getSender(),
            toNano('0.15'), // TON for collection
            1,
            1,
            nft_content,
            toNano('0.2'), // TON for nft item
            23552,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 700,
        });
    });
});
