// ==UserScript==
// @name            显示YouTube好评/差评比例(好评占比)
// @name:en         yet another simple YouTube video likes/dislikes ratio display
// @namespace       http://tampermonkey.net/
// @version         0.6.0
// @description     治好了我每次看到好评和差评时都忍不住心算一下好评占比的强迫症
// @description:en  Show likes/dislikes ratio of YouTube video.
// @author          SSmJaE
// @match           https://www.youtube.com/*
// @license         GPL-3.0
// @compatible      chrome
// ==/UserScript==

const USER_SETTINGS = {
    checkInterval: 5000,    //多久检查一次是否有新的视频|determine how often to check if there are any new videos
    showAllRatios: true,    //是否显示所有视频的好评率，如果关闭，只显示主视频(也就是正在播放的视频)的好评率|whether show all videos' ratios
    sleepInterval: 500,     //间隔多久查询下一个视频，避免请求过快被ban ip|determine to wait how much time to check next video, for avoiding being banned IP for checking too fast
    colorfulRatio: true,    //是否显示彩色好评率，默认开启，关闭的话，显示灰色|whether to show different colors for the ratio, or just grey
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculate_ratio([upCount, downCount]) {
    upCount = parseInt(upCount.replace(/[^0-9]/ig, ""), 10);
    downCount = parseInt(downCount.replace(/[^0-9]/ig, ""), 10);
    let ratio = Math.round(upCount * 1000 / (upCount + downCount)) / 10;

    if (upCount > 0 && !downCount) ratio = 100;//正无穷
    if (isNaN(ratio)) ratio = 0; //只有0/0会为NaN
    return ratio + "%";
}

async function handle_all() {
    for (let video of document.querySelectorAll('#thumbnail[href]')) {
        if (video.parentElement.parentElement.parentElement.parentElement.parentElement
            .hasAttribute('hidden')) continue; //跳过被隐藏的视频
        if (video.classList.contains('ratio')) continue;

        await sleep(USER_SETTINGS.sleepInterval);
        try {
            fetch(video.getAttribute('href'), { credentials: 'omit' }).then(response => response.text()).then(text => {
                if (!video.classList.contains('ratio')) { //跳过已添加ratio的视频
                    let tooltip = /"INDIFFERENT","tooltip":"(.*?)"/.exec(text)[1];
                    let ratio = calculate_ratio(tooltip.split('/'));

                    let ratioDiv = document.createElement('div');
                    ratioDiv.classList.add('style-scope', 'ytd-video-meta-block', 'ratio');
                    ratioDiv.textContent = ratio;
                    let color = '';
                    if (USER_SETTINGS.colorfulRatio) {
                        if (parseInt(ratio, 10) >= 99) {
                            color = 'rgb(30,144,255)';
                        } else if (parseInt(ratio, 10) >= 90) {
                            color = 'rgb(98,198,70)';
                        } else if (parseInt(ratio, 10) >= 80) {
                            color = 'rgb(255,192,0)';
                        } else {
                            color = 'rgb(207,32,0)';
                        }
                    }
                    ratioDiv.style.color = color;

                    let dot = document.createElement('div');
                    dot.textContent = "•";
                    dot.style.margin = "0 4px";

                    video.parentElement.nextElementSibling.querySelector('#metadata-line').appendChild(dot);
                    video.parentElement.nextElementSibling.querySelector('#metadata-line').appendChild(ratioDiv);
                    video.classList.add('ratio');
                }
            });
        } catch (error) { }
    }
    setTimeout(handle_all, USER_SETTINGS.checkInterval);
}

function handle_main() {
    try {
        let menuBar = document.querySelector('div#info div#menu div#top-level-buttons');
        let up = menuBar.childNodes[0].querySelector('[id="text"]');
        let down = menuBar.childNodes[1].querySelector('[id="text"]');
        let shareButton = menuBar.childNodes[2].querySelector('[id="text"]');
        shareButton.textContent = calculate_ratio([up.getAttribute('aria-label'), down.getAttribute('aria-label')]);
    } catch (e) { }
}

/*------------------------------------------------------------------------- */
setInterval(handle_main, USER_SETTINGS.checkInterval);

if (USER_SETTINGS.showAllRatios)
    setTimeout(handle_all, USER_SETTINGS.checkInterval);
