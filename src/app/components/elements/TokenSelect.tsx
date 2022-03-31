import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import classNames from "clsx";

import { AccountAsset, TokenType } from "core/types";
import { NATIVE_TOKEN_SLUG } from "core/common/tokens";

import { LOAD_MORE_ON_ASSET_FROM_END } from "app/defaults";
import { currentAccountAtom, tokenSlugAtom } from "app/atoms";
import { useAllAccountTokens, useAccountToken } from "app/hooks/tokens";
import { ReactComponent as SelectedIcon } from "app/icons/SelectCheck.svg";

import Select from "./Select";
import PrettyAmount from "./PrettyAmount";
import TokenLogo from "./TokenLogo";

const TokenSelect: FC = () => {
  const currentAccount = useAtomValue(currentAccountAtom);
  const [searchValue, setSearchValue] = useState<string | null>(null);

  const { tokens, loadMore, hasMore } = useAllAccountTokens(
    TokenType.Asset,
    currentAccount.address,
    {
      search: searchValue ?? undefined,
    }
  );

  const [tokenSlug, setTokenSlug] = useAtom(tokenSlugAtom);

  const currentToken = useAccountToken(tokenSlug ?? NATIVE_TOKEN_SLUG);

  const setDefaultTokenRef = useRef(!tokenSlug);

  const observer = useRef<IntersectionObserver>();
  const loadMoreTriggerAssetRef = useCallback(
    (node) => {
      if (!tokens) return;

      if (observer.current) {
        observer.current.disconnect();
      }
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) {
        observer.current.observe(node);
      }
    },
    [hasMore, loadMore, tokens]
  );

  useEffect(() => {
    if (setDefaultTokenRef.current && tokens.length > 0) {
      setTokenSlug([tokens[0].tokenSlug, "replace"]);
      setDefaultTokenRef.current = false;
    }
  }, [setTokenSlug, tokens]);

  const onTokenSelect = useCallback(
    (tSlug: string) => {
      setTokenSlug([tSlug, "replace"]);
    },
    [setTokenSlug]
  );

  const preparedTokens = useMemo(
    () =>
      tokens.map((token) =>
        prepareToken(
          token as AccountAsset,
          "small",
          token.tokenSlug === tokenSlug
        )
      ),
    [tokenSlug, tokens]
  );

  const preparedCurrentToken = useMemo(
    () =>
      currentToken ? prepareToken(currentToken as AccountAsset, "large") : null,
    [currentToken]
  );

  return preparedCurrentToken ? (
    <Select
      items={preparedTokens}
      currentItem={preparedCurrentToken}
      setItem={(asset) => onTokenSelect(asset.key)}
      searchValue={searchValue}
      onSearch={setSearchValue}
      label="Token"
      itemRef={loadMoreTriggerAssetRef}
      loadMoreOnItemFromEnd={LOAD_MORE_ON_ASSET_FROM_END}
      showSelected
      showSelectedIcon={false}
      currentItemClassName={classNames("!p-3")}
      contentClassName="w-[23.25rem] flex flex-col"
    />
  ) : (
    <></>
  );
};

export default TokenSelect;

const Token: FC<{
  asset: AccountAsset;
  isSelected?: boolean;
  size?: "small" | "large";
}> = ({ asset, isSelected = false, size = "small" }) => {
  const { logoUrl, name, symbol, rawBalance, decimals, balanceUSD } = asset;

  return (
    <span
      className={classNames(
        "flex grow",
        "min-w-0",
        size === "large" && "mr-3",
        size === "small" && "items-center"
      )}
    >
      <span className="relative mr-3">
        <TokenLogo
          src={logoUrl}
          className={classNames(
            size === "large" && "w-10 h-10 min-w-[2.5rem]",
            size === "small" && "w-8 h-8 min-w-[2rem]"
          )}
          imageClassName={classNames(isSelected && "opacity-20")}
        />
        {isSelected && (
          <span
            className={classNames(
              "absolute inset-0",
              "rounded-full",
              "border border-brand-light",
              "flex items-center justify-center"
            )}
          >
            <SelectedIcon className="fill-brand-light" />
          </span>
        )}
      </span>
      <span className="flex flex-col justify-between text-left grow min-w-0">
        <span className="flex justify-between">
          <span className="truncate">{symbol}</span>
          <PrettyAmount
            amount={rawBalance ?? 0}
            decimals={decimals}
            currency={symbol}
            className="ml-2"
          />
        </span>
        <span className="flex justify-between">
          <span className="text-xs text-brand-inactivedark font-normal truncate">
            {name}
          </span>
          <PrettyAmount
            amount={balanceUSD ?? 0}
            currency="$"
            className="text-xs font-normal ml-1"
          />
        </span>
      </span>
    </span>
  );
};

const prepareToken = (
  asset: AccountAsset,
  size: "large" | "small" = "small",
  isSelected = false
) => ({
  key: asset.tokenSlug,
  value: <Token asset={asset} size={size} isSelected={isSelected} />,
});
