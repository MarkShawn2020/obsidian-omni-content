/*
 * Copyright (c) 2024 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { wxKeyInfo } from './weixin-api';

export class NMPSettings {
    defaultStyle: string;
    defaultHighlight: string;
    showStyleUI: boolean;
    linkStyle: string;
    // 控制哪些链接转为脚注：none-都不转，all-都转，non-wx-非微信文章转
    linkFootnoteMode: string;
    // 控制脚注中链接的展示形式：empty-为空，description-为链接的描述
    linkDescriptionMode: string;
    embedStyle: string;
    lineNumber: boolean;
    authKey: string;
    useCustomCss: boolean;
    wxInfo: {name:string, appid:string, secret:string}[];
    math: string;
    expireat: Date | null = null;

    private static instance: NMPSettings;

    // 静态方法，用于获取实例
    public static getInstance(): NMPSettings {
        if (!NMPSettings.instance) {
            NMPSettings.instance = new NMPSettings();
        }
        return NMPSettings.instance;
    }

    private constructor() {
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
        this.showStyleUI = true;
        this.linkStyle = 'inline';
        this.linkFootnoteMode = 'non-wx'; // 默认只转换非微信文章链接
        this.linkDescriptionMode = 'empty'; // 默认脚注中不显示描述
        this.embedStyle = 'quote';
        this.lineNumber = true;
        this.useCustomCss = false;
        this.authKey = '';
        this.wxInfo = [];
        this.math = 'latex';
    }

    resetStyelAndHighlight() {
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
    }

    public static loadSettings(data: any) {
        if (!data) {
            return
        }
        const {
            defaultStyle,
            linkStyle,
            linkFootnoteMode,
            linkDescriptionMode,
            embedStyle,
            showStyleUI,
            lineNumber,
            defaultHighlight,
            authKey,
            wxInfo,
            math,
            useCustomCss,
        } = data;

        const settings = NMPSettings.getInstance();
        if (defaultStyle) {
            settings.defaultStyle = defaultStyle;
        }
        if (defaultHighlight) {
            settings.defaultHighlight = defaultHighlight;
        }
        if (showStyleUI !== undefined) {
            settings.showStyleUI = showStyleUI;
        }
        if (linkStyle) {
            settings.linkStyle = linkStyle;
        }
        if (linkFootnoteMode) {
            settings.linkFootnoteMode = linkFootnoteMode;
        }
        if (linkDescriptionMode) {
            settings.linkDescriptionMode = linkDescriptionMode;
        }
        if (embedStyle) {
            settings.embedStyle = embedStyle;
        }
        if (lineNumber !== undefined) {
            settings.lineNumber = lineNumber;
        }
        if (authKey) {
            settings.authKey = authKey;
        }
        if (wxInfo) {
            settings.wxInfo = wxInfo;
        }
        if (math) {
            settings.math = math;
        }
        if (useCustomCss !== undefined) {
            settings.useCustomCss = useCustomCss;
        }
        settings.getExpiredDate();
    }

    public static allSettings() {
        const settings = NMPSettings.getInstance();
        return {
            'defaultStyle': settings.defaultStyle,
            'defaultHighlight': settings.defaultHighlight,
            'showStyleUI': settings.showStyleUI,
            'linkStyle': settings.linkStyle,
            'linkFootnoteMode': settings.linkFootnoteMode,
            'linkDescriptionMode': settings.linkDescriptionMode,
            'embedStyle': settings.embedStyle,
            'lineNumber': settings.lineNumber,
            'authKey': settings.authKey,
            'wxInfo': settings.wxInfo,
            'math': settings.math,
            'useCustomCss': settings.useCustomCss,
        }
    }

    getExpiredDate() {
        if (this.authKey.length == 0) return;
        wxKeyInfo(this.authKey).then((res) => {
            if (res.status == 200) {
                this.expireat = new Date(res.json.expireat);
            }
        })
    }

    isAuthKeyVaild() {
        if (this.authKey.length == 0) return false;
        if (this.expireat == null) return false;
        return this.expireat > new Date();
    }
}