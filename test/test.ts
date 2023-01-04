import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import * as mocha from "mocha-steps";
import { parseEther } from '@ethersproject/units';
import { DiamondInit, DiamondCutFacet, DiamondLoupeFacet,
     OwnershipFacet, ConstantsFacet, BalancesFacet,
     AllowancesFacet, SupplyRegulatorFacet } from '../typechain-types';
import { assert } from 'chai';
import { getSelectors } from "../scripts/libraries/diamond.js";

describe("Diamond Global Test", async () => {
    let diamondCutFacet: DiamondCutFacet;
    let diamondLoupeFacet: DiamondLoupeFacet;
    let ownershipFacet: OwnershipFacet;
    let constantsFacet: ConstantsFacet;
    let balancesFacet: BalancesFacet;
    let allowancesFacet: AllowancesFacet;
    let supplyRegulatorFacet: SupplyRegulatorFacet;

    interface FacetCut {
        facetAddress: string,
        action: FacetCutAction,
        functionSelectors: string[]
    }

    interface FacetToAddress {
        [key: string]: string
    }

    let diamondInit: DiamondInit;

    let owner: SignerWithAddress, admin: SignerWithAddress, 
    user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;

    const totalSupply = parseEther('100000');
    const transferAmount = parseEther('1000');
    const name = "Token Name";
    const symbol = "SYMBOL";
    const decimals = 18;

    beforeEach(async () => {
        [owner, admin, user1, user2, user3] = await ethers.getSigners();
    });

    enum FacetCutAction {
        Add,
        Replace,
        Remove
    }

    // let addressDiamondInit: string;
    let calldataAfterDeploy: string;
    let addressDiamond: string;

    let facetToAddressImplementation: FacetToAddress = {};
    // let facetAddresses = {

    // }

    mocha.step("Деплой контракта который инициализирует значения переменных для функций name(), symbol() и т. д. во время деплоя Diamond", async function() {
        const DiamondInit = await ethers.getContractFactory('DiamondInit');
        diamondInit = await DiamondInit.deploy();
        await diamondInit.deployed();
    });

    let facetCuts: FacetCut[] = [];
    const FacetNames = [
        'DiamondCutFacet',
        'DiamondLoupeFacet',
        'OwnershipFacet'
    ];
    mocha.step("Деплой обязательных граней для обслуживания Diamond", async function() {
        for (const FacetName of FacetNames) {
            const Facet = await ethers.getContractFactory(FacetName)
            const facet = await Facet.deploy()
            await facet.deployed();
            facetCuts.push({
              facetAddress: facet.address,
              action: FacetCutAction.Add,
              functionSelectors: getSelectors(facet)
            });
            facetToAddressImplementation[FacetName] = facet.address;
        };
    });
    
    mocha.step("Формирование calldata, которая будет вызвана из Diamond через delegatecall для инициализации переменных, во время деплоя Diamond", async function () {
        calldataAfterDeploy = diamondInit.interface.encodeFunctionData('initERC20', [
            name,
            symbol,
            decimals,
            admin.address,
            totalSupply
        ]);
    });

    mocha.step("Деплой контракта Diamond", async function () {
        const diamondArgs = {
            owner: owner.address,
            init: diamondInit.address,
            initCalldata: calldataAfterDeploy
        };
        const Diamond = await ethers.getContractFactory('Diamond')
        const diamond = await Diamond.deploy(facetCuts, diamondArgs)
        await diamond.deployed();
        addressDiamond = diamond.address;
    });

    mocha.step("Инициализация обслуживающих контрактов", async function () {
        diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', addressDiamond);
        diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', addressDiamond);
        ownershipFacet = await ethers.getContractAt('OwnershipFacet', addressDiamond);
    });

    mocha.step("Убеждаемся в том, что адреса граней на контракте совпадают с теми, которые были получены при деплое имплементаций", async function () {
        const addresses = [];
        for (const address of await diamondLoupeFacet.facetAddresses()) {
            addresses.push(address)
        }
        assert.sameMembers(Object.values(facetToAddressImplementation), addresses)
    });

    mocha.step("Получим селекторы функций по адресам их граней", async function () {
        let selectors = getSelectors(diamondCutFacet)
        let result = await diamondLoupeFacet.facetFunctionSelectors(facetToAddressImplementation['DiamondCutFacet'])
        assert.sameMembers(result, selectors)
        selectors = getSelectors(diamondLoupeFacet)
        result = await diamondLoupeFacet.facetFunctionSelectors(facetToAddressImplementation['DiamondLoupeFacet'])
        assert.sameMembers(result, selectors)
        selectors = getSelectors(ownershipFacet)
        result = await diamondLoupeFacet.facetFunctionSelectors(facetToAddressImplementation['OwnershipFacet'])
        assert.sameMembers(result, selectors)
    });

    mocha.step("Получим адреса граней по селекторам, кторые относятся к этим граням", async function () {
        assert.equal(
            facetToAddressImplementation['DiamondCutFacet'],
            await diamondLoupeFacet.facetAddress('0x1f931c1c') //diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata)
        )
        assert.equal(
            facetToAddressImplementation['DiamondLoupeFacet'],
            await diamondLoupeFacet.facetAddress('0x7a0ed627') // facets()
        )
        assert.equal(
            facetToAddressImplementation['DiamondLoupeFacet'],
            await diamondLoupeFacet.facetAddress('0xadfca15e') // facetFunctionSelectors(address _facet)
        )
        assert.equal(
            facetToAddressImplementation['OwnershipFacet'],
            await diamondLoupeFacet.facetAddress('0xf2fde38b') // transferOwnership(address _newOwner)
        )
    });

    mocha.step("Трансфер права менять имплементации и обратно", async function () {
        await ownershipFacet.connect(owner).transferOwnership(admin.address);
        assert.equal(await ownershipFacet.owner(), admin.address);
        await ownershipFacet.connect(admin).transferOwnership(owner.address);
        assert.equal(await ownershipFacet.owner(), owner.address);
    });

    mocha.step("Деплой имплементации с константами", async function () {
        const ConstantsFacet = await ethers.getContractFactory("ConstantsFacet");
        const constantsFacet = await ConstantsFacet.deploy();
        constantsFacet.deployed();
        const facetCuts = [{
            facetAddress: constantsFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(constantsFacet)
        }];
        await diamondCutFacet.connect(owner).diamondCut(facetCuts, ethers.constants.AddressZero, "0x00");
        facetToAddressImplementation['ConstantsFacet'] = constantsFacet.address;
    });

    mocha.step("Инициализация имплементации c константами", async function () {
        constantsFacet = await ethers.getContractAt('ConstantsFacet', addressDiamond);
    });

    mocha.step("Проверка констант на наличие", async function () {
        assert.equal(await constantsFacet.name(), "Token Name");
        assert.equal(await constantsFacet.symbol(), symbol);
        assert.equal(await constantsFacet.decimals(), decimals);
        assert.equal(await constantsFacet.admin(), admin.address);
    });

    mocha.step("Деплой имплементации с функцией трансфера", async function () {
        const BalancesFacet = await ethers.getContractFactory("BalancesFacet");
        const balancesFacet = await BalancesFacet.deploy();
        balancesFacet.deployed();
        const facetCuts = [{
            facetAddress: balancesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(balancesFacet)
        }];
        await diamondCutFacet.connect(owner).diamondCut(facetCuts, ethers.constants.AddressZero, "0x00");
        facetToAddressImplementation['BalancesFacet'] = balancesFacet.address;
    });

    mocha.step("Инициализация имплементации c балансами и трансфером", async function () {
        balancesFacet = await ethers.getContractAt('BalancesFacet', addressDiamond);
    });

    mocha.step("Проверка view функции имплементации с балансами и трансфером", async function () {
        expect(await balancesFacet.totalSupply()).to.be.equal(totalSupply);
        expect(await balancesFacet.balanceOf(admin.address)).to.be.equal(totalSupply);
    });

    mocha.step("Проверка трансфера", async function () {
        await balancesFacet.connect(admin).transfer(user1.address, transferAmount);
        expect(await balancesFacet.balanceOf(admin.address)).to.be.equal(totalSupply.sub(transferAmount));
        expect(await balancesFacet.balanceOf(user1.address)).to.be.equal(transferAmount);
        await balancesFacet.connect(user1).transfer(admin.address, transferAmount);
    });

    mocha.step("Деплой имплементации с allowances", async function () {
        const AllowancesFacet = await ethers.getContractFactory("AllowancesFacet");
        const allowancesFacet = await AllowancesFacet.deploy();
        allowancesFacet.deployed();
        const facetCuts = [{
            facetAddress: allowancesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(allowancesFacet)
        }];
        await diamondCutFacet.connect(owner).diamondCut(facetCuts, ethers.constants.AddressZero, "0x00");
        facetToAddressImplementation['ConstantsFacet'] = allowancesFacet.address;
    });

    mocha.step("Инициализация имплементации c балансами и трансфером allowance, approve, transferFrom и т. д.", async function () {
        allowancesFacet = await ethers.getContractAt('AllowancesFacet', addressDiamond);
    });

    mocha.step("Тестрирование функций allowance, approve, transferFrom", async function () {
        expect(await allowancesFacet.allowance(admin.address, user1.address)).to.equal(0);
        const valueForApprove = parseEther("100");
        const valueForTransfer = parseEther("30");
        await allowancesFacet.connect(admin).approve(user1.address, valueForApprove);
        expect(await allowancesFacet.allowance(admin.address, user1.address)).to.equal(valueForApprove);
        await allowancesFacet.connect(user1).transferFrom(admin.address, user2.address, valueForTransfer);
        expect(await balancesFacet.balanceOf(user2.address)).to.equal(valueForTransfer);
        expect(await balancesFacet.balanceOf(admin.address)).to.equal(totalSupply.sub(valueForTransfer));
        expect(await allowancesFacet.allowance(admin.address, user1.address)).to.equal(valueForApprove.sub(valueForTransfer));
    });

    mocha.step("Деплой имплементации с mint и burn", async function () {
        const SupplyRegulatorFacet = await ethers.getContractFactory("SupplyRegulatorFacet");
        supplyRegulatorFacet = await SupplyRegulatorFacet.deploy();
        supplyRegulatorFacet.deployed();
        const facetCuts = [{
            facetAddress: supplyRegulatorFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(supplyRegulatorFacet)
        }];
        await diamondCutFacet.connect(owner).diamondCut(facetCuts, ethers.constants.AddressZero, "0x00");
        facetToAddressImplementation['SupplyRegulatorFacet'] = supplyRegulatorFacet.address;
    });

    mocha.step("Инициализация имплементации c функциями mint и burn", async function () {
        supplyRegulatorFacet = await ethers.getContractAt('SupplyRegulatorFacet', addressDiamond);
    });
    
    mocha.step("Проверка функций mint и burn", async function () {
        const mintAmount = parseEther('1000');
        const burnAmount = parseEther('500');
        await supplyRegulatorFacet.connect(admin).mint(user3.address, mintAmount);
        expect(await balancesFacet.balanceOf(user3.address)).to.equal(mintAmount);
        expect(await balancesFacet.totalSupply()).to.be.equal(totalSupply.add(mintAmount));
        await supplyRegulatorFacet.connect(admin).burn(user3.address, burnAmount);
        expect(await balancesFacet.balanceOf(user3.address)).to.equal(mintAmount.sub(burnAmount));
        expect(await balancesFacet.totalSupply()).to.be.equal(totalSupply.add(mintAmount).sub(burnAmount));
    });
});
