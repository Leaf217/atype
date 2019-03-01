/**
 * @file index.js main
 * @author caixiaowen  zhuyeqing
 */

const cheerio = require('cheerio');
const superagent = require('superagent');
require('superagent-proxy')(superagent);
const mapLimit = require('async/mapLimit');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const blacklist = require('./blacklist');

const {
    host,
    mainPage,
    categoryList,
    categoryName,
    apiList,
    apiHtml,
    urlProp,
    paramTable,
    apiTitle,
    apiParamTable,
    paramColumn,
    typeColumn,
    neccessColumn,
    fileName
} = config;


let apiData = [];
let html;
let IP = [
    'http://219.238.186.188:8118/',
    'http://117.82.222.130:8118/',
    'http://121.201.9.13:3128/'
];


// request main page
function requestContent() {
    return new Promise((resolve, reject) => {
        // request main page
        superagent
        .get(host + mainPage)
        .end((err, sres) => {
            if (err) {
                reject();
            }
            // cheerio parse page data
            let $ = cheerio.load(sres.text);
            html = $.html();
            resolve();
        });
    });
}

// step 1: get API class && API name && API url from the navigation of the sidebar
function getApi() {
    return new Promise((resolve, reject) => {
        let $ = cheerio.load(html);

        // API主列表，内含分类名以及所有API
        let categories = $(categoryList);


        // 获取API分类名称 && API名称 && API URL
        categories.each((i, ele) => {
            // 分类名称
            let eleItem = $(ele).find(categoryName);

            let content = [];

            // 每个分类下的子分类列表
            let apis = $(ele).find(apiList);

            $(apis).each((i, ele) => {

                let subCategoryName = $(ele).children().first().text();

                if (filterSubcategoryFlag(subCategoryName)) {
                    return true;
                }

                let subCategoryUrl = $(ele).children().find('a').attr('href');
                let subContent = [];

                // 每个子分类下API的a标签列表
                let api = $(ele).find(apiHtml);

                $(api).each((i, ele) => {
                    let apiName = $(ele).text();
                    let apiUrl = $(ele).attr(urlProp);
                    // 获取API参数使用的id
                    let id = apiUrl.match(/\#(\S+)\//)[1];

                    if (filterApiFlag(apiName)) {
                        return true;
                    }

                    subContent.push({
                        apiName: modifyApiName(apiName),
                        apiUrl,
                        id,
                        params: []
                    });
                });

                content.push({
                    subCategoryName,
                    subCategoryUrl,
                    subContent
                });

            });
            apiData.push({
                categoryName: eleItem.text(),
                content
            });
        });
        resolve();
    });
}

// whether filter subCategory
function filterSubcategoryFlag(name) {
    return blacklist.subCategory.includes(name);
}

// filter API name
function filterApiFlag(name) {
    // filter API in blacklist and API that includes dot
    return blacklist.apiName.includes(name) || /\./g.test(name);
}

// modify API name
function modifyApiName(name) {
    name = /\(.*\)/g.test(name) ? name.replace(/\(.*\)/g, '') : name;
    return name;
}


// step 2: get params including name && type && if required
function getParams() {
    return new Promise((resolve, reject) => {
        apiData.forEach(eachCategory => {

            let apis = eachCategory.content;

            mapLimit(apis, 100, (eachSubCategery, callback) => {
                let {subCategoryUrl, subContent} = eachSubCategery;
                let random = Math.floor(IP.length * Math.random());
                let proxy = process.env.http_proxy || IP[random];

                // API参数的标题名称
                // let paramObjTit = ['Object参数说明', 'OBJECT参数说明', 'Object参数', 'options参数说明', '参数说明'];

                superagent
                .get(host + subCategoryUrl)
                .proxy(proxy)
                .end((err, sres) => {
                    if (err) {
                        console.log(err);
                        reject();
                    }
                    let $ = cheerio.load(sres.text);
                    subContent.forEach(eachApi => {
                        let $el = $('#' + eachApi.id);
                        let hasH2 = $el.nextAll().filter('h2');
                        let hasTable;

                        if (hasH2) {
                            // API为h2标题时，需保证不受下面其他API的影响
                            hasTable = $el.nextUntil(apiTitle).filter(apiParamTable);
                        }
                        else {
                            hasTable = $el.nextAll().filter(apiParamTable);
                        }

                        // 删掉冒号和空格
                        // title = title.replace(/\：|\:|\s/g, '');

                        // 从表格读取参数
                        // 判断是否有表格 且 第一个表格前一个相邻元素的标题是否是paramObjName中的一个
                        let param = {};
                        let params = [];
                        if (hasTable) {
                            hasTable.first().find(paramTable).each((index, ele) => {
                                if (ele) {
                                    let $param = $(ele).find(paramColumn);
                                    let $type = $(ele).find(typeColumn);
                                    let $neccess = $(ele).find(neccessColumn);
                                    param = {
                                        name: $param.text(),
                                        type: $type.text(),
                                        required: $neccess.text()
                                    };
                                    params.push(param);
                                }
                            });
                        }
                        eachApi.params = params;
                    });
                    // 每次请求完毕后调用一下callback，即下方的err函数
                    callback();
                });
            }, err => {
                if (err) {
                    throw err;
                }
                resolve();
            });
        });
    });
}

// main function
function start() {
    requestContent()

    // step 1
    .then(() => getApi())

    // step 2
    .then(() => getParams())

    // step 3: write data into file
    .then(() => {
        fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(apiData, null, 2));
        console.log(105, 'write file success');
    }).catch(err => {
        throw err;
    });
}

start();


