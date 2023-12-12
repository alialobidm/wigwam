import { memo, useEffect, useMemo, useState } from "react";
import classNames from "clsx";
import { useAtomValue } from "jotai";

import { WalletStatus } from "core/types";

import { hasSeedPhraseAtom, walletStatusAtom } from "app/atoms";
import { useSteps } from "app/hooks/steps";
import { AddAccountStep } from "app/nav";
import AddAccountHeader from "app/components/blocks/AddAccountHeader";
import { ReactComponent as CreateIcon } from "app/icons/addaccount-create.svg";
import { ReactComponent as ImportIcon } from "app/icons/addaccount-import.svg";
import { ReactComponent as LedgerIcon } from "app/icons/addaccount-ledger.svg";
import { ReactComponent as ChevronRightIcon } from "app/icons/chevron-right.svg";

import ConfirmAccounts from "./ConfirmAccounts";
import LedgerScanModal from "./shared/LedgerScanModal";

const AddAccountInitial = memo(() => {
  const hasSeedPhrase = useAtomValue(hasSeedPhraseAtom);
  const [ledgerOpened, setLedgerOpened] = useState(false);

  return (
    <>
      {!hasSeedPhrase ? (
        <ChooseAddAccountWay onLedgerOpened={() => setLedgerOpened(true)} />
      ) : (
        <ConfirmAccounts addMore onLedgerOpened={() => setLedgerOpened(true)} />
      )}

      {ledgerOpened && (
        <LedgerScanModal onOpenChange={() => setLedgerOpened(false)} />
      )}
    </>
  );
});

export default AddAccountInitial;

const ChooseAddAccountWay = memo<{ onLedgerOpened?: () => void }>(
  ({ onLedgerOpened }) => {
    const walletStatus = useAtomValue(walletStatusAtom);
    const { navigateToStep, stateRef } = useSteps();

    useEffect(() => {
      stateRef.current = {};
    }, [stateRef]);

    const isInitialWallet = walletStatus === WalletStatus.Welcome;

    const items = useMemo(
      () =>
        [
          {
            title: "Create a new wallet",
            description: "Start fresh with a new wallet from scratch",
            Icon: CreateIcon,
            action: () => {
              stateRef.current.addSeedPhraseType = "craete";
              navigateToStep(AddAccountStep.CreateSeedPhrase);
            },
          },
          "divider",
          {
            title: "Import or recover wallet",
            description: "Using your own secret phrase or private key",
            Icon: ImportIcon,
            action: () => {
              stateRef.current.addSeedPhraseType = "import";
              navigateToStep(AddAccountStep.ImportSeedPhrase);
            },
          },
          {
            title: "Ledger",
            description: "Connect your Ledger wallet",
            Icon: LedgerIcon,
            action: () => {
              onLedgerOpened?.();
            },
          },
        ] as const,
      [stateRef, navigateToStep, onLedgerOpened],
    );

    return (
      <>
        <AddAccountHeader
          className="mb-12"
          description={
            isInitialWallet ? "Join the future of finance with Wigwam" : null
          }
        >
          {isInitialWallet ? "Let’s start your journey" : "Add more wallets"}
        </AddAccountHeader>

        <div
          className={classNames(
            "w-full mx-auto max-w-lg",
            "rounded-xl",
            "bg-white bg-opacity-5",
            "p-3",
          )}
        >
          {items.map((item, i, arr) => {
            if (item === "divider") {
              return (
                <div key={i} className="h-px w-full bg-brand-main/[.07] my-4" />
              );
            }

            const { Icon, title, description, action } = item;
            const first = i === 0;
            const last = i === arr.length - 1;

            return (
              <button
                key={i}
                className={classNames(
                  "relative group",
                  "w-full p-2",
                  !last && "mb-3",
                  "flex items-stretch",
                  first && "bg-white bg-opacity-5",
                  "rounded-lg",
                  "transition-colors",
                  "hover:bg-brand-main/5",
                )}
                onClick={action}
              >
                <Icon
                  className={classNames(
                    first ? "w-[3.5rem]" : "w-[2.75rem]",
                    "h-auto mx-1",
                  )}
                />

                <div
                  className={classNames(
                    "ml-4 flex flex-col items-start justify-around",
                  )}
                >
                  <span className="font-bold text-lg text-white">{title}</span>
                  <span className="font-normal text-sm text-brand-inactivedark">
                    {description}
                  </span>
                </div>

                <ChevronRightIcon
                  className={classNames(
                    "w-6 h-auto",
                    "absolute right-2.5 top-1/2 -translate-y-1/2",
                    "transition",
                    "group-hover:translate-x-0 group-hover:opacity-100",
                    "-translate-x-1.5 opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
      </>
    );
  },
);
