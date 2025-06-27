import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, storeStateInit, toNano } from '@ton/core';
import { MarketplaceContract } from '../wrappers/MarketplaceContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import {
    KeyPair,
    keyPairFromSecretKey,
    keyPairFromSeed,
    sign,
    mnemonicToSeed,
    mnemonicToPrivateKey,
    mnemonicWordList,
} from '@ton/crypto';
import { todo } from 'node:test';

describe('MarketplaceContract', () => {
    let code: Cell;
    let public_key: Buffer<ArrayBufferLike>;
    let secret_key: Buffer<ArrayBufferLike>;

    beforeAll(async () => {
        code = await compile('MarketplaceContract');
        const words = [
            'test',
            'orange',
            'biometry',
            'car',
            'science',
            'classic',
            'sahara',
            'kitchen',
            'violet',
            'speed',
            'kill',
            'submarine',
            'business',
            'glue',
            'oil',
            'jail',
            'spy',
            'risk',
            'yield',
            'water',
            'knee',
        ];
        const privateKey = await mnemonicToPrivateKey(words);
        public_key = privateKey.publicKey;
        secret_key = privateKey.secretKey;
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let marketplaceContract: SandboxContract<MarketplaceContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        marketplaceContract = blockchain.openContract(
            MarketplaceContract.createFromConfig(
                {
                    seqno: 0,
                    subwallet_id: 0x6bd21f9b,
                    public_key,
                },
                code,
            ),
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await marketplaceContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: marketplaceContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and marketplaceContract are ready to use
    });
    it('should successfully deploy a contract', async () => {
        const data = beginCell().storeUint(1, 64).storeAddress(deployer.address).endCell();
        const stateInit = beginCell()
            .storeUint(6, 5)
            .storeRef(await compile('NftItem'))
            .storeRef(data)
            .endCell();

        const forwardBody = beginCell().endCell();

        const fullData = beginCell().storeRef(stateInit).storeRef(forwardBody).endCell();

        const signature = sign(fullData.hash(), secret_key);

        const deployResult = await marketplaceContract.sendDeployContract(
            deployer.getSender(),
            toNano('0.05'),
            signature,
            stateInit,
            forwardBody,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: marketplaceContract.address,
            success: true,
        });
    });
});
