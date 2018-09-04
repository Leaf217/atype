import express from 'express';
const cheerio = require('cheerio');
const superagent = require('superagent');
const fs = require('fs');
const path = require('path');
const app = express();

// const formData = require('./form.js'); // 转化数据格式

import { DICT } from './config.js';
const host = DICT.host;
const mainPage = DICT.mainPage;

let api_url = [];

// 第一步：从某个页面的chapter抓取api
function findData() {
    return new Promise((resolve, reject) => {
        superagent.get(host + mainPage)//请求页面地址
        .buffer(true)
        .end((err, sres) => {//页面获取到的数据
            if (err) {
                reject(err);
            }
            console.log(111);

            let $ = cheerio.load(sres.text); // 用cheerio解析页面数据
            let $api = $('.m-doc-sidebar-nav-selected[data-name|="api"] > ul > li');

            $api.each((index, element) => {
                let $eleItem = $(element).find('a');
                api_url.push({
                    title: $eleItem.attr('href'),
                    content: []
                });
            });
            // 依次读取每个chapter的api
            findTable().then(() => {
                console.log(888);
                resolve();
            }).catch((err) => {
                console.log(err);
                throw err;
            });
        });
    });
}

// 第三步：读取表格里的api
function readTable(url) {
    return new Promise((resolve, reject) => {
        superagent.get(host + url.title)
        .buffer(true)
        .end((err, sres) => {
            console.log('000');
            let item = [];
            if (err) {
                reject(err);
            }

            let $ = cheerio.load(sres.text);
            $('.article-entry tbody tr').each((index, element) => {
                let $el = $(element).find('a');
                let it = {
                    title: $el.text(),
                    href: $el.attr('href'),
                    param: []
                }
                // 文档拼写有错，待文档修正可去除
                /********/
                if (it.title == 'requestPolymerPayment 百度电商开放平台：产品介绍') {
                    it.title = 'requestPolymerPayment';
                } else if (it.title == 'clearStorageSyn') {
                    it.title = 'clearStorageSync';
                }
                /********/
                item.push(it);
            });
            url.content = item;
            resolve(url);
        });
    });
}

// 第二步：对应每个api表格
function findTable() {
    return new Promise((resolve) => {
        let len = api_url.length;
        for(let i = 0; i < len; i++) {
            console.log(222);
            readTable(api_url[i]).then((res) => {
                console.log(333);
                api_url[i] = res;
                return findParam(api_url[i].content);
            }).then(() => {
                console.log(444);
                if (i == len - 1) {
                    resolve(i);
                }
            }).catch((err) => {
                throw err;
            });
        }
    });
}

// 第五步：读取必需参数
function readParam (obj, href) {
    return new Promise((resolve, reject) => {
        superagent.get(href)
        .buffer(true)
        .end((err, sres) => {
            if (err) {
                reject(err);
            }

            let $ = cheerio.load(sres.text);
            let title = obj.title;
            let p = /[\.\,\(\)]/g;
            if (p.test(title)) {
                title = title.replace(p, '-');
                let p3 = /[\-*]$/g;
                while (p3.test(title)) {
                    title = title.replace(p3, '');
                }
                let p2 = /[\[\]\ ]/g;
                if (p2.test(title)) {
                    title = title.replace(p2, '');
                }
            }
            let $el = $('#' + title);
            let hasH2 = $el.nextAll().filter('h2');
            let $hasTable;
            if (hasH2) {
                let hasH3 = $el.nextUntil('h2').filter('h3');
                if (hasH3) {
                    $hasTable = $el.nextUntil('h3').filter('table');
                } else {
                    $hasTable = $el.nextUntil('h2').filter('table');
                }
            } else {
                let hasH3 = $el.nextAll().filter('h3');
                if (hasH3) {
                    $hasTable = $el.nextUntil('h3').filter('table');
                } else {
                    $hasTable = $el.nextAll().filter('table');
                }
            }
            if ($hasTable) {
                let par = [];
                $hasTable.first().find('tbody > tr').each((index, element) => {
                    console.log(1010);
                    let $param = $(element).find('td:nth-of-type(1)');
                    let $neccess = $(element).find('td:nth-of-type(3)');
                    if ($neccess.text() == '是') {
                        par.push($param.text());
                    }
                });
                obj.param = par;
            }       
            console.log(1212, obj);
            resolve(obj);
        });
    });
}

// 第四步：
function findParam(content) {
    return new Promise((resolve) => {
        let len = content.length;
        for(let i = 0; i < len; i++) {
            readParam(content[i], content[i].href).then((res) => {
                console.log(666, content[i].href);
                console.log(1313);
                content[i] = res;
                console.log(777, content[i]);
                // 数据写入文件
                fs.writeFileSync(path.join(__dirname, 'app.json'), JSON.stringify(api_url, null, 2));
                return res;
            }).then(() => {
                if (i == len - 1) {
                    resolve(i);
                }
            }).catch((err) => {
                throw err;
            });
        }
    });
}

app.get('/', (req, res, next) => {
    findData().then(() => {
        console.log(999, '写入成功');
        // formData.form();  // 转化数据格式
    }).catch((err) => {
        throw err;
    });

    res.send('读取数据成功');
});

app.listen(8811, () => {
    console.log('抓取成功~~~');
});