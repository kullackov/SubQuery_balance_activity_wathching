import {SubstrateEvent} from "@subql/types";
import {Account, ActivityType, TotalActivity, Activity} from "../types";

async function getAccount(id: string): Promise<Account> {
    let account = await Account.get(id);
    if (account === undefined) {
        account = new Account(id);
        account.lastTotalActivitiesCount = 0;
        account.lastBalanceDepositsCount = 0;
        account.lastBalanceWithdrawsCount = 0;
        account.lastBalanceTransfersCount = 0;
    }
    return account;
}

async function impl(event: SubstrateEvent, type: ActivityType): Promise<void> {
    const {event: {data: [eventAccount, balance]}} = event;

    const blockDate = event.block.timestamp;

    const account = await getAccount(eventAccount.toString());
    account.lastActivityDate = blockDate;
    account.lastTotalActivitiesCount += 1;

    const uniqueId = `${event.block.block.header.number}-${event.idx.toString()}`;
    const blockHeight = event.block.block.header.number.toNumber();

    const totalActivity = new TotalActivity(uniqueId);
    totalActivity.accountId = eventAccount.toString();
    totalActivity.blockHeight = blockHeight;
    totalActivity.date = blockDate;
    totalActivity.count = account.lastTotalActivitiesCount;

    const activity = new Activity(uniqueId);
    activity.type = type;
    activity.accountId = eventAccount.toString();
    activity.blockHeight = blockHeight;
    activity.date = blockDate;

    switch (type) {
        case ActivityType.BALANCE_DEPOSIT:
            account.lastBalanceDepositsCount += 1;
            activity.count = account.lastBalanceDepositsCount;
            break;
        case ActivityType.BALANCE_TRANSFER:
            account.lastBalanceTransfersCount += 1;
            activity.count = account.lastBalanceTransfersCount;
            break;
        case ActivityType.BALANCE_WITHDRAW:
            account.lastBalanceWithdrawsCount += 1;
            activity.count = account.lastBalanceWithdrawsCount;
            break;         
    }
    
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
