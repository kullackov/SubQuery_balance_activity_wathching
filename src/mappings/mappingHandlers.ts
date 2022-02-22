import {SubstrateEvent} from "@subql/types";
import {Account, ActivityType, TotalActivity, Activity} from "../types";
import {Balance} from "@polkadot/types/interfaces";

async function getAccount(id: string): Promise<Account> {
    let account = await Account.get(id);
    if (account === undefined) {
        account = new Account(id);
        account.allActivitiesCount = 0;
        account.balanceDepositsCount = 0;
        account.balanceWithdrawsCount = 0;
        account.balanceTransfersCount = 0;
        account.totalVolume = BigInt(0);
        account.balanceDepositsVolume = BigInt(0);
        account.balanceWithdrawsVolume = BigInt(0);
        account.balanceTransfersVolume = BigInt(0);
    }
    return account;
}

async function impl(event: SubstrateEvent, type: ActivityType): Promise<void> {

    const {event: {data: [eventAccount]}} = event;

    const blockDate = event.block.timestamp;

    const account = await getAccount(eventAccount.toString());
    account.lastActivityDate = blockDate;
    account.allActivitiesCount += 1;

    const uniqueId = `${event.block.block.header.number}-${event.idx.toString()}`;
    const blockHeight = event.block.block.header.number.toNumber();

    const totalActivity = new TotalActivity(uniqueId);
    totalActivity.accountId = eventAccount.toString();
    totalActivity.blockHeight = blockHeight;
    totalActivity.date = blockDate;
    totalActivity.count = account.allActivitiesCount;

    const activity = new Activity(uniqueId);
    activity.type = type;
    activity.accountId = eventAccount.toString();
    activity.blockHeight = blockHeight;
    activity.date = blockDate;

    let eventVolume = BigInt(0);

    switch (type) {
        case ActivityType.BALANCE_DEPOSIT: {
            const volume = event.event.data[1];
            eventVolume = (volume as Balance).toBigInt();
            account.balanceDepositsCount += 1;
            account.balanceDepositsVolume += eventVolume;
            activity.count = account.balanceDepositsCount;
            activity.totalVolume = account.balanceDepositsVolume;
            break;
        }
        case ActivityType.BALANCE_TRANSFER: {
            const volume = event.event.data[2];
            eventVolume = (volume as Balance).toBigInt();
            account.balanceTransfersCount += 1;
            account.balanceTransfersVolume += eventVolume;
            activity.count = account.balanceTransfersCount;
            activity.totalVolume = account.balanceTransfersVolume;
            break;
        }
        case ActivityType.BALANCE_WITHDRAW: {
            const volume = event.event.data[1];
            eventVolume = (volume as Balance).toBigInt();
            account.balanceWithdrawsCount += 1;
            account.balanceWithdrawsVolume += eventVolume;
            activity.count = account.balanceWithdrawsCount;
            activity.totalVolume = account.balanceWithdrawsVolume;
            break;         
        }
    }

    account.totalVolume += eventVolume;
    totalActivity.totalVolume = account.totalVolume;
    
    await account.save();
    await totalActivity.save();
    await activity.save();    
}

export async function handleBalancesDeposit(event: SubstrateEvent): Promise<void> {
    await impl(event, ActivityType.BALANCE_DEPOSIT);
}

export async function handleBalancesTransfer(event: SubstrateEvent): Promise<void> {
    await impl(event, ActivityType.BALANCE_TRANSFER);
}

export async function handleBalancesWithdraw(event: SubstrateEvent): Promise<void> {
    await impl(event, ActivityType.BALANCE_WITHDRAW);
}
