import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { address, beginCell, Cell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import '@ton/test-utils';
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
        const common_content = beginCell().storeStringTail('https://rom6n.github.io/mc1f/nft-c1-item-').endCell();
        const collection_content = beginCell()
            .storeStringTail('https://mysite.com/nft-collection-content/11234.json')
            .endCell();
        content = beginCell().storeRef(collection_content).storeRef(common_content).endCell();
        royalty_params = beginCell().storeUint(3, 16).storeUint(100, 16).storeAddress(owner.address).endCell(); // comission to owner 3% (user that created collection)

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
            .storeAddress(address('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'))
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Your NFT has deployed!')
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
    it('should UNsuccessfully deploy batch NFT due wrong index (1nft)', async () => {
        const nft_content = beginCell()
            .storeAddress(owner.address)
            .storeRef(beginCell().storeStringTail('nft-1.json').endCell())
            .storeCoins(toNano('0.05'))
            .storeStringTail('Hello')
            .endCell();

        const deployNftResult = await nftCollection.sendDeployBatchNft(
            owner.getSender(),
            toNano('0.15'), // TON for collection
            2,
            2,
            nft_content,
            toNano('0.2'), // TON for nft item
            23552,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 501,
        });
    });

    it('should successfully change owner', async () => {
        const changeResult = await nftCollection.sendChangeOwner(
            owner.getSender(),
            toNano('0.05'),
            sender.address,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.owner.toString({ testOnly: true })).toBe(sender.address.toString({ testOnly: true }));
    });
    it('should UNsuccessfully change owner due not from owner', async () => {
        const changeResult = await nftCollection.sendChangeOwner(
            sender.getSender(),
            toNano('0.05'),
            sender.address,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: sender.address,
            to: nftCollection.address,
            success: false,
            exitCode: 401,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.owner.toString({ testOnly: true })).toBe(owner.address.toString({ testOnly: true }));
    });

    it('should successfully change content', async () => {
        const newContent = beginCell()
            .storeRef(beginCell().storeStringTail('collection_content').endCell())
            .storeRef(beginCell().storeStringTail('common_content').endCell())
            .endCell();
        const changeResult = await nftCollection.sendChangeContent(
            editor.getSender(),
            toNano('0.05'),
            newContent,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: editor.address,
            to: nftCollection.address,
            success: true,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.collection_content).toBe('collection_content');
    });
    it('should UNsuccessfully change content due not from editor', async () => {
        const newContent = beginCell()
            .storeRef(beginCell().storeStringTail('collection_content').endCell())
            .storeRef(beginCell().storeStringTail('common_content').endCell())
            .endCell();

        const changeResult = await nftCollection.sendChangeContent(
            sender.getSender(),
            toNano('0.05'),
            newContent,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: sender.address,
            to: nftCollection.address,
            success: false,
            exitCode: 402,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.collection_content).toBe('https://mysite.com/nft-collection-content/11234.json');
    });

    it('should successfully change royalty params', async () => {
        const newRoyalty = beginCell().storeUint(15, 16).storeUint(1000, 16).storeAddress(owner.address).endCell();
        const changeResult = await nftCollection.sendChangeRoyaltyParams(
            editor.getSender(),
            toNano('0.05'),
            newRoyalty,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: editor.address,
            to: nftCollection.address,
            success: true,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.royalty_params_min).toBe(15);
    });
    it('should UNsuccessfully change royalty params due not from editor', async () => {
        const newRoyalty = beginCell().storeUint(15, 16).storeUint(1000, 16).storeAddress(owner.address).endCell();
        const changeResult = await nftCollection.sendChangeRoyaltyParams(
            owner.getSender(),
            toNano('0.05'),
            newRoyalty,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 402,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.royalty_params_min).toBe(3);
    });

    it('should successfully change editor', async () => {
        const changeResult = await nftCollection.sendChangeEditor(
            editor.getSender(),
            toNano('0.05'),
            owner.address,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: editor.address,
            to: nftCollection.address,
            success: true,
        });

        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.editor_address.toString({ testOnly: true })).toBe(
            owner.address.toString({ testOnly: true }),
        );
    });
    it('should UNsuccessfully change editor due not from editor', async () => {
        const changeResult = await nftCollection.sendChangeEditor(
            owner.getSender(),
            toNano('0.05'),
            owner.address,
            34968,
        );

        expect(changeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 402,
        });

        const collectionData = await nftCollection.getCollectionData();
        const collectionData2 = await nftCollection.getCollectionData2();
        expect(collectionData.editor_address.toString({ testOnly: true })).toBe(
            editor.address.toString({ testOnly: true }),
        );
        console.log(`collection metadata: ${collectionData.collection_content}`);
        console.log(`collection metadata2: ${collectionData2.collection_content}`);
    });

    it('should successfully change code', async () => {
        const changeResult = await nftCollection.sendChangeCode(editor.getSender(), toNano('0.05'), code, 34968);

        expect(changeResult.transactions).toHaveTransaction({
            from: editor.address,
            to: nftCollection.address,
            success: true,
        });
    });
    it('should UNsuccessfully change code due not from editor', async () => {
        const changeResult = await nftCollection.sendChangeCode(owner.getSender(), toNano('0.05'), code, 34968);

        expect(changeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 402,
        });
    });

    it('should UNsuccessfully end due wrong op-code', async () => {
        const changeResult = await nftCollection.sendWrongOpCode(editor.getSender(), toNano('0.05'), 34968);

        expect(changeResult.transactions).toHaveTransaction({
            from: editor.address,
            to: nftCollection.address,
            success: false,
            exitCode: 65535,
        });
    });
    it('should UNsuccessfully end due wrong op-code and not an editor', async () => {
        const changeResult = await nftCollection.sendWrongOpCode(owner.getSender(), toNano('0.05'), 34968);

        expect(changeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false,
            exitCode: 402,
        });
    });
});
