import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
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

        const deployResult = await nftCollection.sendDeploy(owner.getSender(), toNano('100'));

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
        const nft_content = beginCell().storeStringTail('nft-1.json').endCell();
        const deployNftResult = await nftCollection.sendDeployNft(
            owner.getSender(),
            toNano(0.05),
            1,
            toNano(0.02),
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
        const nft_content = beginCell().storeStringTail('nft-1.json').endCell();
        const deployNftResult = await nftCollection.sendDeployNft(
            sender.getSender(),
            toNano(0.05),
            1,
            toNano(0.02),
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
        const nft_content = beginCell().storeStringTail('nft-1.json').endCell();
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
        const nft_content = beginCell().storeStringTail('nft-1.json').endCell();
        const deployNftResult = await nftCollection.sendDeployNft(
            owner.getSender(),
            toNano(0.05),
            1,
            toNano(500),
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

    it('should successfully deploy batch NFT', async () => {
        const nft_content = beginCell().storeStringTail('nft-1.json').endCell();
        const deployNftResult = await nftCollection.sendDeployBatchNft(
            owner.getSender(),
            toNano('100'),
            1,
            127,
            nft_content,
            toNano('0.01'),
            34503,
        );

        expect(deployNftResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });
    });
});
