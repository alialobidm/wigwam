import { FC, useCallback, useEffect, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useMaybeAtomValue } from "lib/atom-utils";
import { fromProtectedString, toProtectedString } from "lib/crypto-utils";

import { AccountSource, SeedPharse, WalletStatus } from "core/types";
import {
  generatePreviewHDNodes,
  getSeedPhraseHDNode,
  toNeuterExtendedKey,
} from "core/common";
import { addAccounts } from "core/client";

import { AddAccountStep } from "app/nav";
import {
  addAccountModalAtom,
  allAccountsAtom,
  getNeuterExtendedKeyAtom,
  hasSeedPhraseAtom,
  walletStatusAtom,
} from "app/atoms";
import { useSteps } from "app/hooks/steps";
import { useDialog } from "app/hooks/dialog";

import AccountsToAdd from "./AccountToAdd";

const VerifyAccountToAdd: FC = () => {
  const walletStatus = useAtomValue(walletStatusAtom);
  const initialSetup = walletStatus === WalletStatus.Welcome;
  const { stateRef, navigateToStep } = useSteps();
  const setAccModalOpened = useSetAtom(addAccountModalAtom);

  const addresses = stateRef.current.importAddresses;
  const { alert } = useDialog();

  const handleContinue = useCallback(
    async (addAccountsParams) => {
      try {
        if (initialSetup) {
          Object.assign(stateRef.current, { addAccountsParams });
          navigateToStep(AddAccountStep.SetupPassword);
        } else {
          await addAccounts(addAccountsParams);
          setAccModalOpened([false]);
        }
      } catch (err: any) {
        alert({ title: "Error!", content: err.message });
      }
    },
    [alert, initialSetup, navigateToStep, setAccModalOpened, stateRef]
  );

  if (addresses && addresses.length > 0) {
    return (
      <AccountsToAdd accountsToVerify={addresses} onContinue={handleContinue} />
    );
  }

  if (initialSetup) {
    return <VerifyAccountToAddInitial />;
  }

  return <VerifyAccountToAddExisting />;
};

export default VerifyAccountToAdd;

const VerifyAccountToAddInitial: FC = () => {
  const { stateRef, reset, navigateToStep } = useSteps();
  const { alert } = useDialog();

  const extendedKey: string | undefined = stateRef.current.extendedKey;
  const seedPhrase: SeedPharse | undefined = stateRef.current.seedPhrase;
  const derivationPath = stateRef.current.derivationPath;

  const neuterExtendedKey = useMemo(() => {
    if (extendedKey) {
      return extendedKey;
    }
    if (seedPhrase && derivationPath) {
      return toNeuterExtendedKey(
        getSeedPhraseHDNode(seedPhrase),
        derivationPath
      );
    }

    return null;
  }, [extendedKey, derivationPath, seedPhrase]);

  useEffect(() => {
    if (!neuterExtendedKey) {
      reset();
    }
  }, [neuterExtendedKey, reset]);

  const addresses = useMemo(
    () =>
      neuterExtendedKey
        ? generatePreviewHDNodes(neuterExtendedKey).map(
            ({ address, index, publicKey }) => ({
              source: extendedKey
                ? AccountSource.Ledger
                : AccountSource.SeedPhrase,
              address,
              index: index.toString(),
              publicKey: toProtectedString(publicKey),
            })
          )
        : null,
    [extendedKey, neuterExtendedKey]
  );

  const handleContinue = useCallback(
    async (addAccountsParams) => {
      try {
        Object.assign(stateRef.current, { addAccountsParams });
        navigateToStep(AddAccountStep.SetupPassword);
      } catch (err: any) {
        alert({ title: "Error!", content: err.message });
      }
    },
    [alert, navigateToStep, stateRef]
  );

  if (!addresses) {
    return null;
  }

  return (
    <AccountsToAdd accountsToVerify={addresses} onContinue={handleContinue} />
  );
};

const VerifyAccountToAddExisting: FC = () => {
  const hasSeedPhrase = useMaybeAtomValue(hasSeedPhraseAtom);
  const { reset, stateRef } = useSteps();

  const extendedKey: string | undefined = stateRef.current.extendedKey;
  const derivationPath = stateRef.current.derivationPath;

  const rootNeuterExtendedKey = useMaybeAtomValue(
    hasSeedPhrase && derivationPath
      ? getNeuterExtendedKeyAtom(derivationPath)
      : null
  );

  const importedAccounts = useMaybeAtomValue(allAccountsAtom);
  const setAccModalOpened = useSetAtom(addAccountModalAtom);
  const { alert } = useDialog();

  const isCreatingNew = stateRef.current.addAccounts === "existing-create";

  const neuterExtendedKey = useMemo(() => {
    if (extendedKey) {
      return extendedKey;
    }
    if (rootNeuterExtendedKey) {
      return fromProtectedString(rootNeuterExtendedKey);
    }

    return null;
  }, [extendedKey, rootNeuterExtendedKey]);

  useEffect(() => {
    if (!neuterExtendedKey) {
      reset();
    }
  }, [neuterExtendedKey, reset]);

  const findFirstUnusedAccount = useCallback(
    (key: string, offset = 0, limit = 9) => {
      const newAccounts = generatePreviewHDNodes(key, offset, limit);

      if (!importedAccounts || importedAccounts.length <= 0) {
        return {
          source: extendedKey ? AccountSource.Ledger : AccountSource.SeedPhrase,
          address: newAccounts[0].address,
          index: newAccounts[0].index.toString(),
          publicKey: toProtectedString(newAccounts[0].publicKey),
        };
      }

      const filteredAccounts = newAccounts.filter(
        ({ address }) =>
          !importedAccounts.some(
            ({ address: imported }) => imported === address
          )
      );

      if (filteredAccounts.length <= 0) {
        return null;
      }

      return {
        source: extendedKey ? AccountSource.Ledger : AccountSource.SeedPhrase,
        address: filteredAccounts[0].address,
        name: `Wallet ${filteredAccounts[0].index + 1}`,
        index: filteredAccounts[0].index.toString(),
        isDisabled: true,
        isDefaultChecked: true,
        publicKey: toProtectedString(filteredAccounts[0].publicKey),
      };
    },
    [extendedKey, importedAccounts]
  );

  const addresses = useMemo(() => {
    if (!neuterExtendedKey) {
      return null;
    }

    if (!isCreatingNew) {
      const newAccounts = generatePreviewHDNodes(neuterExtendedKey).map(
        ({ address, index, publicKey }) => ({
          source: extendedKey ? AccountSource.Ledger : AccountSource.SeedPhrase,
          address,
          index: index.toString(),
          publicKey: toProtectedString(publicKey),
        })
      );

      if (!importedAccounts || importedAccounts.length <= 0) {
        return newAccounts;
      }

      return newAccounts.map(({ address, index, publicKey }) => {
        const isAddressImported = importedAccounts.find(
          ({ address: imported }) => {
            return imported === address;
          }
        );

        return {
          source: extendedKey ? AccountSource.Ledger : AccountSource.SeedPhrase,
          address,
          index: index.toString(),
          name: isAddressImported?.name ?? undefined,
          isDisabled: isAddressImported,
          isDefaultChecked: isAddressImported,
          isAdded: isAddressImported,
          publicKey: publicKey,
        };
      });
    }

    let offset = 0;
    let limit = 9;
    let unusedAccount = null;
    while (unusedAccount === null) {
      unusedAccount = findFirstUnusedAccount(neuterExtendedKey, offset, limit);
      offset = limit;
      limit += 9;
    }

    return [unusedAccount];
  }, [
    extendedKey,
    findFirstUnusedAccount,
    importedAccounts,
    isCreatingNew,
    neuterExtendedKey,
  ]);

  const handleContinue = useCallback(
    async (addAccountsParams) => {
      try {
        await addAccounts(addAccountsParams);
        setAccModalOpened([false]);
      } catch (err: any) {
        alert({ title: "Error!", content: err.message });
      }
    },
    [alert, setAccModalOpened]
  );

  if (!addresses) {
    return null;
  }

  return (
    <AccountsToAdd accountsToVerify={addresses} onContinue={handleContinue} />
  );
};
