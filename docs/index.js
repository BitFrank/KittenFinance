/*!
 * KittenFinance (KIF)
 * http://kitten.finance/
 * Copyright 2020. MIT Licensed.
 */

var maxHex = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

$(async function () {
    for (var i = 2; i <= 3; i++) {
        var clone = $('#token_box_1').clone().prop('id', 'token_box_' + i);
        $("#token_boxes").append(clone);
    }
    // $('.token_panel').hide();
    consoleInit()

    const App = await init_ethers();
    if (App != null) {
        _print(`Initialized ${App.YOUR_ADDRESS}`);

        var netInfo = await App.provider.getNetwork()
        if (netInfo.chainId != 1) {
            _print_bold('You are not on Ethereum Mainnet')
        }

        setPoolData(App)
        checkPool(1, App)
        checkPool(2, App)
        checkPool(3, App)
    }
    hideLoading();
});

function setPoolData(App) {
    App.Pool = [{}, {}, {}, {}]
    App.Pool[1] = {
        TOKEN_NAME: 'WETH',
        TOKEN_NAME_FULL: '<a href="https://relay.radar.tech" target="_blank">WETH</a>',
        POOL_ADDR: WETH_POOL_ADDR,
        POOL_ABI: WETH_POOL_ABI,
        TOKEN_ADDR: WETH_TOKEN_ADDR,
        TOKEN_ABI: WETH_TOKEN_ABI
    }
    App.Pool[2] = {
        TOKEN_NAME: 'KIF',
        TOKEN_NAME_FULL: '<a href="https://etherscan.io/address/0x177ba0cac51bfc7ea24bad39d81dcefd59d74faa" target="_blank">KIF</a>',
        POOL_ADDR: KIF_POOL_ADDR,
        POOL_ABI: KIF_POOL_ABI,
        TOKEN_ADDR: KIF_TOKEN_ADDR,
        TOKEN_ABI: KIF_TOKEN_ABI
    }
    App.Pool[3] = {
        TOKEN_NAME: 'UNI-V2 LP',
        TOKEN_NAME_FULL: '<a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x177BA0cac51bFC7eA24BAd39d81dcEFd59d74fAa" target="_blank">KIF-ETH UNI-V2 LP</a>',
        POOL_ADDR: UNI_POOL_ADDR,
        POOL_ABI: UNI_POOL_ABI,
        TOKEN_ADDR: UNI_TOKEN_ADDR,
        TOKEN_ABI: UNI_TOKEN_ABI
    }
    for (var num = 1; num <= 3; num++) {
        if (App.Pool[num].POOL_ADDR == null)
            continue
        App.Pool[num].TOKEN = new ethers.Contract(App.Pool[num].TOKEN_ADDR, App.Pool[num].TOKEN_ABI, App.provider).connect(App.provider.getSigner());
        App.Pool[num].POOL = new ethers.Contract(App.Pool[num].POOL_ADDR, App.Pool[num].POOL_ABI, App.provider);
    }
}

async function contractTask(task, num, App) {

    const contractWithSigner = App.Pool[num].POOL.connect(App.provider.getSigner());

    var this_box = '#token_box_' + num + ' '
    var this_panel_log = $(this_box + '.token_panel_log')

    this_panel_log.html('sending to Metamask...')

    var amt = $(this_box + '.token_panel_amt').val()
    var amtParse = parseFloat(amt);
    if ((isNaN(amtParse)) || (amtParse <= 0)) {
        amtParse = 0
    }

    if ((task == 'btn_stake') || (task == 'btn_stake_all')) {
        if (task == 'btn_stake_all') {
            $(this_box + '.token_panel_amt').val(App.Pool[num].haveAmtFloor)
            amt = App.Pool[num].haveAmt
        } else if (amtParse <= 0) {
            this_panel_log.html('Please enter amount.')
        } else {
            amt = ethers.utils.parseUnits(amt, 18)
        }

        const approveAmt = await App.Pool[num].TOKEN.allowance(App.YOUR_ADDRESS, App.Pool[num].POOL_ADDR)
        if (amt.gt(approveAmt)) {
            this_panel_log.html('approving...')
            App.Pool[num].TOKEN.approve(App.Pool[num].POOL_ADDR, ethers.BigNumber.from(maxHex))
            .then(function (e) {
                this_panel_log.html('transaction sent (please refresh page afterwards)')
            })
            .catch(function (e) {
                this_panel_log.html('user denied.')
            })
        } else {
            contractWithSigner.stake(amt)
            .then(function (e) {
                this_panel_log.html('transaction sent (please refresh page afterwards)')
            })
            .catch(function (e) {
                this_panel_log.html('amount error or user denied.')
            })
        }
    } else if (task == 'btn_claim') {
        contractWithSigner.getReward()
        .then(function (e) {
            this_panel_log.html('transaction sent (please refresh page afterwards)')
        })
        .catch(function (e) {
            this_panel_log.html('error or user denied.')
        })
    } else if (task == 'btn_withdraw') {
        if (amtParse <= 0) {
            this_panel_log.html('Please enter amount.')
        } else {
            amt = ethers.utils.parseUnits(amt, 18)
            contractWithSigner.withdraw(amt)
            .then(function (e) {
                this_panel_log.html('transaction sent (please refresh page afterwards)')
            })
            .catch(function (e) {
                this_panel_log.html('amount error or user denied.')
            })
        }
    } else if (task == 'btn_exit') {
        contractWithSigner.exit()
        .then(function (e) {
            this_panel_log.html('transaction sent (please refresh page afterwards)')
        })
        .catch(function (e) {
            this_panel_log.html('error or user denied.')
        })
    }
}

async function checkPool(num, App) {

    var this_box = '#token_box_' + num + ' '
    const THIS_POOL = App.Pool[num].POOL

    var this_pool_desc = `Pool ${num} : stake ${App.Pool[num].TOKEN_NAME_FULL} to breed KIF`
    var this_log = $(this_box + '.token_log')[0]
    var this_loader = $(this_box + '.token_loader')
    _print(this_pool_desc, this_log)

    if (App.Pool[num].POOL_ADDR === null) {
        _print('Pool 🌾 opening soon', this_log)
        this_loader.hide()
        return
    }

    const timeStart = await THIS_POOL.starttime()
    const timeTilStart = timeStart - (Date.now() / 1000);

    if (timeTilStart > 0) {
        _print(`Breeding starts    : in ${forHumans(timeTilStart)}`, this_log)
    } else {
        $(this_box + ".btn_stake").on("click", async function (event) {
            await contractTask('btn_stake', num, App)
        });
        $(this_box + ".btn_stake_all").on("click", async function (event) {
            await contractTask('btn_stake_all', num, App)
        });
        $(this_box + ".btn_claim").on("click", async function (event) {
            await contractTask('btn_claim', num, App)
        });
        $(this_box + ".btn_withdraw").on("click", async function (event) {
            await contractTask('btn_withdraw', num, App)
        });
        $(this_box + ".btn_exit").on("click", async function (event) {
            await contractTask('btn_exit', num, App)
        });

        App.Pool[num].haveAmt = await App.Pool[num].TOKEN.balanceOf(App.YOUR_ADDRESS)
        App.Pool[num].haveAmtFloor = Math.floor(App.Pool[num].haveAmt / 1e18 * 10000) / 10000
        $(this_box + '.btn_stake_all').html("Stake all " + toFixed(App.Pool[num].haveAmtFloor, 4))

        $(this_box + '.token_panel').show()

        _print(`Breeding started   : ${forHumans(-timeTilStart)} ago`, this_log)

        const totalAmount = await THIS_POOL.totalSupply() / 1e18;
        const weekly_reward = await get_synth_weekly_rewards(THIS_POOL);
        _print(`There are ${toFixed(totalAmount, 2)} ${App.Pool[num].TOKEN_NAME} staked, breeding ${weekly_reward} KIF this week`, this_log)

        const stakedAmount = await THIS_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
        _print(`\nYou are staking ${stakedAmount} ${App.Pool[num].TOKEN_NAME} (${toFixed(stakedAmount * 100 / totalAmount, 3)}% of the pool)`, this_log)

        const earned = await THIS_POOL.earned(App.YOUR_ADDRESS) / 1e18;
        _print(`Claimable rewards : ${toFixed(earned, 4)} 🐱 KIF`, this_log)

        const rewardPerToken = weekly_reward / totalAmount;
        var apy = ''
        if (num == 2) {
            apy = ` (APY ${toFixed(weekly_reward / totalAmount * 365.25/7*100, 1)} %)`
        } else if (num == 3) {
            apy = ` (APY ~${toFixed(weekly_reward / totalAmount * 365.25/7*100/2, 1)} %)`
        }
        _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedAmount, 2)} 🐱 KIF` + apy, this_log)

        const nextHalving = await getPeriodFinishForReward(THIS_POOL);
        const timeTilHalving = nextHalving - (Date.now() / 1000);
        _print(`Next halving      : in ${forHumans(timeTilHalving)}`, this_log)
    }
    this_loader.hide()

}
