#!/usr/bin/env bash

set -E

# Kills all subshells on receipt of a 0 kill signal. Used to terminate the testnet
# once the tests are finished running.
trap "kill 0" SIGINT

# Checks for truffle.
command -v truffle >/dev/null 2>&1 || { echo "Truffle is required but not found. Exiting." >&2; exit 1; }

# The following mnemonic generates the following accounts:

# Available Accounts
# ==================
# (0) 0x58e95845a3c2740f4b1b4c639a75ada64ef0b72f
# (1) 0xbf51c40cdb04a8bbf14581c2fb3b9b4d7de39dcc
# (2) 0x870c5adad8cf61194bd0a9a98dd6928375e53101
# (3) 0x38a4cd64b3c5f1daf7b2b7aecb2973ded10cb89c
# (4) 0x55ce364695752c880548bca4fd7fcf175c714eac
# (5) 0x580ca217edeba28a84cbe6b70b34baa2342a03fc
# (6) 0xdc030c6971f6fff8b04c6511e50e739a81ac1ef1
# (7) 0x6e73757d483de4335d6a493d31255ce8da4d4a27
# (8) 0x12ab912bfcd522a14b607b00709e53ab157ca983
# (9) 0x79f4a447cd92d51358e788eadafe700a0e29cfa3
#
# Private Keys
# ==================
# (0) 3758a358751ec079fd81b0e08b89a769fd5c87fdd314cb236e555397bf31d784
# (1) 62d01fb86676e3736e224905e1255c8a0c722c4ddc3e653b148aa851692a1b1e
# (2) 414dec5618be3677ad928e7569ab50c6670e1d4f3d8b482aea4bfc36f10b7b73
# (3) 417c42a66fbf94d8988dbd3d1e8e8fbe71509d40b5607e8542a35eaadea3b71f
# (4) 0a2bb02f677ff186ae4bfe629d672c376ff68cad58683766ae762e670f171d64
# (5) 2eb2efdf08c6979020c5d0f0d46fa4d167b58f768ca5a5f9fc957e556aa0400b
# (6) f11b72bcb11eb464b0c010e221fd055a84245110462917d58fdeec9ab069bcd3
# (7) 14389099c52a8202427bbe98b34a0e838b7d8b34dbc4dd4904edfbbd5e7e421f
# (8) 608e34803f694ded49188cbc467c82561b2ef953002e0531c5f8f37463570d65
# (9) 879a2fac9eca7b5a88c1ff00daf764b8e5599484e249cb2408aca2a92fc7e9a0

echo "Starting TestRPC..."

NOW=$(date +%s)

# Start up a Ganache testnet with 10,000 ether per account using the given mnemonic.
(
  MNEMONIC="soup behave plastic gift bounce tobacco leader siren company tennis double ethics"
  ../../node_modules/.bin/ganache-cli -m "${MNEMONIC}" > /dev/null
) &

sleep 1

# The code below downloads, extracts, and installs dependencies for @machinomy/contracts. These contracts
# are then migrated to the testnet. awk is used to parse the output of truffle migrate and extract the
# address of Unidirectional.sol.

ORIGINAL_DIR=$(pwd)
TMP_DIR="/tmp/machinomy-itests-$NOW"
mkdir ${TMP_DIR}
cd ${TMP_DIR}
echo "Downloading and extracting @machinomy/contracts..."
curl -sL https://github.com/machinomy/contracts/archive/v4.0.13.tar.gz --output v4.0.13.tar.gz
tar -xzf v4.0.13.tar.gz
cd contracts-4.0.13
echo "Installing contracts dependencies..."
yarn install
echo "Deploying contracts..."
truffle migrate --reset --network development > log.txt
CONTRACT_ADDR=$(awk '/Unidirectional: /{ print $2 }' log.txt)
cd ${ORIGINAL_DIR}
rm -rf ${TMP_DIR}
echo "Running tests..."

(
  MACHINOMY_GETH_ADDR=http://localhost:8545 CONTRACT_ADDRESS=${CONTRACT_ADDR} SENDER_ADDRESS=0x58e95845a3c2740f4b1b4c639a75ada64ef0b72f RECEIVER_ADDRESS=0xbf51c40cdb04a8bbf14581c2fb3b9b4d7de39dcc yarn integration_test || exit 1
) &

# Wait until tests complete, then kill the testnet.
wait $!
kill 0
