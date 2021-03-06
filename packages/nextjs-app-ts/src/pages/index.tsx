import { Balance } from 'eth-components/ant';
import { useBalance, useContractReader, useEthersAdaptorFromProviderOrSigners, useEventListener } from 'eth-hooks';
import { useBlockNumberContext, useEthersAppContext } from 'eth-hooks/context';
import { useDexEthPrice } from 'eth-hooks/dapps';
import { asEthersAdaptor } from 'eth-hooks/functions';
import React, { FC, ReactElement } from 'react';

import { useLoadAppContracts, useConnectAppContracts, useAppContracts } from '~common/components/context';
import { useCreateAntNotificationHolder } from '~common/components/hooks/useAntNotification';
import { useBurnerFallback } from '~common/components/hooks/useBurnerFallback';
import { useScaffoldAppProviders } from '~common/components/hooks/useScaffoldAppProviders';
import { Footer } from '~~/components/common/Footer';
import { Header } from '~~/components/common/Header';
import { TokenVendor } from '~~/components/main/TokenVendor';
import { ViewEvents } from '~~/components/main/ViewEvents';
import {
  BURNER_FALLBACK_ENABLED,
  CONNECT_TO_BURNER_AUTOMATICALLY,
  INFURA_ID,
  LOCAL_PROVIDER,
  MAINNET_PROVIDER,
  TARGET_NETWORK_INFO,
} from '~~/config/app.config';

/** ********************************
 * ⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️
 * See ./config/app.config.ts for configuration, such as TARGET_NETWORK
 * See ../common/src/config/appContracts.config.ts and ../common/src/config/externalContracts.config.ts to configure your contracts
 * See pageList variable below to configure your pages
 * See ../common/src/config/web3Modal.config.ts to configure the web3 modal
 * ⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️⛳️
 * ******************************** */

interface IMainPageProps {
  pageName: string;
  children?: ReactElement;
}

export const MainPage: FC<IMainPageProps> = () => {
  const notificationHolder = useCreateAntNotificationHolder();
  const scaffoldAppProviders = useScaffoldAppProviders({
    targetNetwork: TARGET_NETWORK_INFO,
    connectToBurnerAutomatically: CONNECT_TO_BURNER_AUTOMATICALLY,
    localProvider: LOCAL_PROVIDER,
    mainnetProvider: MAINNET_PROVIDER,
    infuraId: INFURA_ID,
  });

  const ethersAppContext = useEthersAppContext();
  useBurnerFallback(scaffoldAppProviders, BURNER_FALLBACK_ENABLED);

  useLoadAppContracts();
  const [mainnetAdaptor] = useEthersAdaptorFromProviderOrSigners(MAINNET_PROVIDER);
  useConnectAppContracts(mainnetAdaptor);
  useConnectAppContracts(asEthersAdaptor(ethersAppContext));

  const GLD = useAppContracts('GLD', ethersAppContext.chainId);
  const Vendor = useAppContracts('Vendor', ethersAppContext.chainId);
  const [tokensPerEth] = useContractReader(Vendor, Vendor?.tokensPerEth);

  const [ethPrice] = useDexEthPrice(
    scaffoldAppProviders.mainnetAdaptor?.provider,
    ethersAppContext.chainId !== 1 ? scaffoldAppProviders.targetNetwork : undefined
  );

  const [yourGLD, updateYourGLD] = useContractReader(GLD, GLD?.balanceOf, [ethersAppContext.account ?? '']);

  const [vendorEth, updateVendorEth] = useBalance(Vendor?.address ?? '');
  const [vendorGLD, updateVendorGLD] = useContractReader(GLD, GLD?.balanceOf, [Vendor?.address ?? '']);

  const [buyEvents] = useEventListener(Vendor, 'BuyTokens', 0);
  const [sellEvents] = useEventListener(Vendor, 'SellTokens', 0);

  const updateBalancesPostTransaction = () => {
    // manually triggering balance updates when an action is taken, because there is a bug where they do not update on block update
    updateYourGLD();
    updateVendorGLD();
    updateVendorEth();
  };

  const blockNumber = useBlockNumberContext();
  React.useEffect(() => {
    updateBalancesPostTransaction();
  }, [blockNumber]);

  return (
    <div className="App">
      <Header scaffoldAppProviders={scaffoldAppProviders} price={ethPrice} />
      <div id="hero" className="my-6">
        <div className="text-5xl font-black font-display">BUY AND SELL GLD TOKENS</div>
        <div className="mt-2 text-lg">
          <span className="font-semibold">GLD⚜</span> tokens are fictional ERC20 token hosted on rinkeby.
          <br />
          The exchange rate is {tokensPerEth?.toString() ?? 'NaN'} GLD for 1 Goerli ETH.
        </div>
      </div>

      <div id="your-bal" className="px-6 mx-auto mt-8 mb-10 bg-gray w-fit rounded-md">
        <div className="flex flex-row items-center px-4 py-2">
          <span className="text-xl font-bold font-display">YOUR BALANCE:</span>
          <div className="font-medium">
            <Balance balance={yourGLD} address={undefined} fontSize={20} />
          </div>
          <span className="text-xl font-bold font-display">GLD ⚜️</span>
        </div>
      </div>
      <div id="vendor" className="my-6">
        {ethersAppContext.active && <TokenVendor />}
      </div>
      <div id="vendor-balances" className="py-6">
        <span id="info-text" className="text-xl font-bold font-display">
          THE VENDOR CURRENTLY HOLDS:
        </span>
        <div id="bals" className="flex flex-row justify-center">
          <div id="eth-bal" className="flex flex-row items-center px-3 mx-6 text-2xl p bg-yellow ">
            <Balance balance={vendorEth} address={undefined} />
            <span>ETH</span>
          </div>
          <br />
          <div id="gld-bal" className="flex flex-row items-center px-3 mx-6 text-2xl font-body p bg-yellow">
            <Balance balance={vendorGLD} address={undefined} />
            <span>GLD</span>
          </div>
        </div>
      </div>

      <ViewEvents sellEvents={sellEvents} buyEvents={buyEvents} />

      <Footer scaffoldAppProviders={scaffoldAppProviders} price={ethPrice} />
      <div style={{ position: 'absolute' }}>{notificationHolder}</div>
    </div>
  );
};
export default MainPage;
