/**
 * PSlider 多性能滑动组件
 * @class  PSlider
 * @param  conf
 * @author Rowbiy
 * @date   2017-10-28
 * @param  conf.wrapper='#ps-wrapper'   容器
 * @param  conf.mainPage='.main-page'   滚动单元的元素
 * @param  conf.startIndex=0            设置初始显示的页码
 * @param  conf.speed=350               动画速度 单位:ms
 * @param  conf.triggerDist=0.15        触发自滑动的手指移动最小百分比
 * @param  conf.canLoopPlay=true        是否允许循环滑动，默认允许
 *
 * //极简用法
 * new PSlider();                       //容器默认是 #ps-wrapper  元素默认是 .main-page
 *
 * //一般用法
 * var ps = new PSlider({
 *      wrapper:'#container',
 *      mainPage:'.main-p'
 * });
 *
 * longPages: 若页面中存在长页面，需要指定所有长页面的页码，从0开始
 *
 * noSlides: 设置某些页面不可以滑动，不允许滑动方式分3三种，需要指出"noPrev" | "noNext" | "both"，必须
 *
 * //滑动到指定页码,第一个参数为页码
 * ps.slideTo(2);
 *
 */
;(function(){
    function PSlider(conf) {
        this.config = {
            wrapper:'#ps-wrapper',
            mainPage:'.main-page',
            startIndex:0,            //启动页面
            speed:400,               //滑屏速度 单位:ms
            triggerDist: 0.25,       //触发滑动的手指移动最小位移 百分比单位
            canLoopPlay: false,      //是否允许循环滑动
            longPages:[],            //长页面
            noSlides:{},             //不允许滑动的页面,noPrev表示不允许下滑去上一页，noNext表示不允许上滑去下一页，both表示上下滑均不可
            turnDirection:"vertical",//翻页方向 垂直-vertical 水平-horizontal
            hasLastPage: false,      //是否显示尾页，默认显示
            hasProgressBar: false,   //是否显示进度条，默认显示
            turnEffect:"normal",     //翻页效果，默认普通
            viewType:"campaign",     //页面内容类型，分模版-template 和 活动-campaign
            animationSet: {}         //所有页面动画集合对象
        };
        for (var i in conf) {
            this.config[i] = conf[i];
        }
        this.init();
    }

    PSlider.prototype = {
        wrapper: null,               //页面包裹元素
        pageList: null,              //所有要滑动的页面元素
        touchStartY: 0,              //每次滑动的第一个接触点的Y坐标
        touchStartX: 0,              //每次滑动的第一个接触点的X坐标
        touchLock: false,            //防止暴力滑动
        deltaY: 0,                   //在每个页面上相对于第一个触点的后续Y轴滑动偏移量，放手后的真实偏移值
        deltaX: 0,                   //在每个页面上相对于第一个触点的后续X轴滑动偏移量，放手后的真实偏移值
        dy: 0,                       //长页面每次拖动时形成的偏移值，拖动过程中产生的临时偏移值
        displayHeight: 0,            //滑动区域main-page高度
        displayWidth: 0,             //滑动区域main-page宽度
        pageListLength: 0,           //滑块的个数
        currentIndex: null,          //当前展示页下标
        nextPage: null,              //下一页下标
        mouseHasDown: false,         //如果是pc端，判断鼠标有没有点下
        bonus: 0,                    //长页面的相比视口的偏移值，负数
        involvedPage: -1,            //每次滑动时，涉及的上个页面，下标
        touchStartTime: 0,           //记录滑动时，touchStart时间
        acceleration: 0.0025,        //默认缓动加速度值
        upIconPosition: 0,           //向上箭头的初始位置
        rightIconPosition: 0,        //向左箭头的初始位置
        animationPlayed: {},         //记录每个元素已经播放的动画
        progressBar: null,           //进度条结点
        longPageWantTurn: null,      //标志翻页时，长页面是否翻页/滚动意图，默认无意图
        longPageInScrolling: false,  //长页面是否正在滚动中
        constructor: PSlider,
        init: function () {
            this.index = this.config.index || 0;
            this.wrapper = this.queryElement(this.config.wrapper)[0];
            if (!this.wrapper) {
                throw Error('请设置包裹容器!');
            }
            this.wrapper.style.cssText += "; position: relative;width: 100%;height: 100%;-webkit-user-select:none;user-select:none;";
            this.displayHeight = this.wrapper.clientHeight;
            this.displayWidth = this.wrapper.clientWidth;
            this.upIconPosition = this.displayHeight - 40;
            this.rightIconPosition = this.displayHeight / 2 - 10;

            this.config.hasLastPage && this.addLastPage();

            this.pageList = this.queryElement(this.config.mainPage);
            this.pageListLength = this.pageList.length;
            //只有一张滑块的时候，不允许循环滑动
            this.config.canLoopPlay = (this.pageListLength === 1) ? false : this.config.canLoopPlay;

            this.setIndicationIconAnimation();

            this.resetPages(); //重置每个section的样式

            this.initIndicationIcon();

            this.initAnimation();

            this.bindEvent();

            this.config.hasProgressBar && this.initProgressBar();

            if(this.config.viewType === "template") { //模版
                if(this.utils.isInMobile()){
                    this.initWaterMark("当前模版仅供预览");
                    this.initButtons();
                }else{
                    this.initWindowMessage();
                }
            }else if(this.utils.getQueryString("status") === "TRAIL") { //测试活动
                this.initWaterMark("当前为测试活动");
            }

            this._slideTo(this.config.startIndex);
        },
        //强制重置每个section的样式
        resetPages: function () {
            for (var i = 0; i < this.pageListLength; i++) {
                this.pageList[i].style.cssText += '; display:none;position:absolute;height:100%;overflow:hidden;width:100%;z-index: 1;background:#fff;-webkit-backface-visibility:hidden;';
                if(this.isLongPage(this.currentIndex)){
                    this.pageList[i].children[0].style.cssText += '; -webkit-backface-visibility:hidden;';
                    this.pageList[i].classList.add("ps-long-page");
                }
            }
        },
        //提供水印
        initWaterMark: function (tip) {
            var w = document.createElement("div");
            w.style.cssText += "; position:absolute;padding:0 20px;height:20px;line-height:20px;text-align:center;font-size:12px;color:#fff;top:0;left:1px;border-bottom-left-radius: 15px;border-bottom-right-radius: 15px;background-color:rgba(0,0,0,.2);z-index:999999;";
            w.innerText = tip;
            this.wrapper.appendChild(w);
        },
        //模版预览时提供上下翻页按钮
        initButtons: function () {
            var that = this;
            var style = "; position:absolute;font-size:14px;color:#fff;bottom:25px;xxx;border-radius: 5px;padding: 5px 10px;background-color:rgba(0,0,0,.3);z-index:999999;-webkit-user-select:none;";
            var s1 = document.createElement("div");
            s1.style.cssText += style.replace("xxx", "left:15%");
            s1.innerText = "上一页";

            var s2 = document.createElement("div");
            s2.style.cssText += style.replace("xxx", "right:15%");
            s2.innerText = "下一页";
            s1.addEventListener("click",function (e) {
                that.slideToPrev();
                e.stopPropagation();
            });
            s1.addEventListener("touchmove",function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
            s2.addEventListener("click",function (e) {
                that.slideToNext();
                e.stopPropagation();
            });
            s2.addEventListener("touchmove",function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
            this.wrapper.appendChild(s1);
            this.wrapper.appendChild(s2);
        },
        //postMessage解决跨域问题
        initWindowMessage: function () {
            var that = this;
            //响应事件
            window.addEventListener('message', function(event) {
                switch (event.data) {
                    case "howManyPages":
                        event.source.postMessage(that.pageListLength, event.origin);
                        break;
                    case "goNext":
                        that.slideToNext();
                        break;
                    case "goPrev":
                        that.slideToPrev();
                        break;
                }
            }, false);
        },
        //动态切换翻页方式
        changeSliderMethod: function (newMethod) {
            var turnDirection = newMethod.split("-")[0];
            var turnEffect = newMethod.split("-")[1];
            if (turnDirection !== this.config.turnDirection) {
                this.config.turnDirection = turnDirection;
                for (var i = 0; i < this.pageListLength; i++) {
                    this.pageList[i].removeChild(this.pageList[i].lastChild);
                    this.pageList[i].appendChild(this.addIndication());
                }
            }
            this.config.turnEffect = turnEffect;
        },
        //配置尾页
        addLastPage: function () {
            //如果当前只有一页，根据滑动限制添加指示器
            if(this.pageListLength === 1) {
                var currentPageBans = this.config.noSlides[this.currentIndex];//当前页的滑动限制
                if (currentPageBans !== "noNext" && currentPageBans !== "both") {
                    this.pageList[this.currentIndex].appendChild(this.addIndication());
                }
            }
            var lastPage = document.createElement("section");
            lastPage.id = "ps-last-page";
            lastPage.className = (this.wrapper.id === "ps-wrapper") ? "ps-section" : "edit-page-box";
            lastPage.style.cssText += "; display:none;z-index:1;position: absolute;width:100%;height:100%;background:#faf !important;";
            var text = document.createElement("div");
            text.innerText = "大家好，我是结尾logo页面！";
            text.style.cssText += "; width:250px;height:250px;background:#fff;line-height:250px;margin:150px auto;border:1px solid #ccc;border-radius:10px;";
            lastPage.appendChild(text);
            lastPage.appendChild(this.addIndication());
            this.wrapper.appendChild(lastPage);
            this.pageList = this.queryElement(this.config.mainPage);
            this.pageListLength = this.pageList.length;
            this.config.hasLastPage = true;
            this.drawProgressBar();
        },
        //去除尾页
        removeLastPage: function () {
            var p = document.getElementById("ps-last-page");
            if (p) {
                //如果刚好在尾页
                if (this.currentIndex === this.pageListLength - 1){
                    this.currentIndex = this.pageListLength - 2;
                }
                this.setCurrent(this.pageList[this.currentIndex]);
                p.parentNode.removeChild(p);
                this.pageList = this.queryElement(this.config.mainPage);
                this.pageListLength = this.pageList.length;
                this.config.hasLastPage = false;
                this.drawProgressBar();
                //重新设置最后页指示箭头展示与否
                if(this.config.canLoopPlay){
                    this.pageList[this.pageListLength - 1].lastChild.style.visibility = "block";
                }else{
                    this.pageList[this.pageListLength - 1].lastChild.style.visibility = "hidden";
                }
                if(this.pageListLength === 1){
                    this.pageList[0].lastChild.style.visibility = "hidden";
                }
            }
        },
        //绘制进度条
        drawProgressBar: function () {
            var pro = document.getElementById("ps-progress-bar");
            if (pro){
                this.progressBar.firstChild.style.cssText += "; width:" + this.displayWidth * (this.currentIndex + 1) / this.pageListLength + "px;";
                this.progressBar.lastChild.innerText = (this.currentIndex + 1) + "/" + this.pageListLength;
            }
        },
        //配置进度条
        initProgressBar: function () {
            var progressBar = document.createElement("div");
            progressBar.id = "ps-progress-bar";
            progressBar.style.cssText += "; position:absolute;height:4px;width:100%;bottom:0;left:0;border-radius:2px;background-color:rgba(0,0,0,.2);z-index:999999;";
            var span = document.createElement("span");
            var spanWidth = this.displayWidth * (this.config.startIndex + 1) / this.pageListLength;
            span.style.cssText += "; display:block;height:100%;width:" + spanWidth + "px;background-color: #08a1ef;-webkit-transition: width .8s cubic-bezier(.26,.86,.44,.985);";
            var em = document.createElement("em");
            em.style.cssText += "; display: inline-block;position: absolute;right: 4px;top: -16px;font-size: 12px;font-style: normal;color: #fff;";
            em.innerText = (this.config.startIndex + 1) + "/" + this.pageListLength;
            progressBar.appendChild(span);
            progressBar.appendChild(em);
            this.wrapper.appendChild(progressBar);
            this.progressBar = progressBar;
        },
        //隐藏||展示进度条
        toggleProgressBar: function () {
            var b = document.getElementById("ps-progress-bar");
            if (b) {
                if (this.config.hasProgressBar) {
                    b.style.cssText += "; display:block;";
                } else {
                    b.style.cssText += "; display:none;";
                }
            } else {
                this.initProgressBar();
            }
        },
        //取消||设置循环播放
        toggleLoopPlay: function () {
            var lastPage = this.pageList[this.pageListLength - 1];
            var lastPageBans = this.config.noSlides[this.pageListLength - 1];
            if (this.config.canLoopPlay) {
                if (lastPageBans !== "noNext" && lastPageBans !== "both") {
                    lastPage.lastChild.style.cssText += "; visibility:visible;";
                }
            } else {
                lastPage.lastChild.style.cssText += "; visibility:hidden;";
            }
        },
        //设置翻页箭头图标的初始位置
        initIndicationIcon: function () {
            for (var i = 0; i < this.pageListLength; i++) {
                if(this.pageList[i].lastChild && this.pageList[i].lastChild.className !== "ps-indication") {
                    this.pageList[i].appendChild(this.addIndication());
                }
            }
        },
        //添加滑动加指示器
        addIndication: function () {
            var tipDiv = document.createElement("div");
            tipDiv.className = "ps-indication";
            var tipLeft = document.createElement("span");
            var tipRight = tipLeft.cloneNode(false);
            var tipLeftCss = "; display:inline-block;background:#fff;width:6px;height:18px;border-radius:3px;-webkit-transform:rotate(45deg) translate(-2px,-2px);box-shadow:1px -1px 1px #646464";
            var tipRightCss = "; display:inline-block;background:#fff;width:6px;height:20px;border-top-left-radius: 3px;border-top-right-radius: 3px;-webkit-transform:rotate(-225deg) translateX(-4px);box-shadow:-1px -1px 1px #646464;margin-left:2px;";
            var sty = ";position:absolute;z-index:999999;-webkit-animation: start- 1.4s infinite ease-in-out normal both;top:";
            if(this.config.turnDirection === "vertical"){
                tipDiv.style.cssText += sty.replace("start-","start-v") + this.upIconPosition + "px;left:50%;margin-left:-10px;";
            } else if(this.config.turnDirection === "horizontal"){
                tipDiv.style.cssText += sty.replace("start-","start-x") + this.rightIconPosition + "px;right:15px;margin-top:-10px;";
            }
            tipLeft.style.cssText += tipLeftCss;
            tipRight.style.cssText += tipRightCss;
            tipDiv.appendChild(tipLeft);
            tipDiv.appendChild(tipRight);
            return tipDiv;
        },
        //设置翻页箭头图标的动画，并写入head
        setIndicationIconAnimation: function () {
            var animationV = "@-webkit-keyframes start-v {0%, 30% {opacity: 0;transform: translateY(10px);} 60% {opacity: 1;transform: translateY(0);} 100% {opacity: 0;transform: translateY(-12px);}}";
            var animationX = "@-webkit-keyframes start-x {0%{-webkit-transform: rotate(-90deg);}0%,30% {opacity: 0;transform: translateX(10px) rotate(-90deg);} 60% {opacity: 1;transform: translateX(0) rotate(-90deg);} 100% {opacity: 0;transform: translateX(-12px) rotate(-90deg);}}";
            if(document.getElementsByTagName("style").length){
                document.getElementsByTagName("style")[0].innerHTML += animationV + animationX;
            }else{
                var style = document.createElement("style");
                style.innerHTML = animationV + animationX;
                document.getElementsByTagName("head")[0].appendChild(style);
            }
        },
        /**
         * 用户配置点击页面跳转
         * @param pageIndex 跳转的页码，从0开始
         * @param slideDirection 跳转方向，4种，downToUp，upToDown，leftToRight,rightToLeft
         */
        slideTo: function (pageIndex, slideDirection) {
            if(Math.floor(pageIndex) !== pageIndex){ throw Error('跳转页码格式不正确!');}
            var index = (pageIndex >= 0 && pageIndex < this.pageListLength) ? pageIndex : 0;

            switch(this.config.turnDirection){
                case "vertical":
                    slideDirection = (typeof slideDirection === "undefined" || slideDirection === 1) ? "downToUp" : "upToDown";
                    break;
                case "horizontal":
                    slideDirection = (typeof slideDirection === "undefined" || slideDirection === 1) ? "rightToLeft" : "leftToRight";
                    break;
            }
            this._slideTo(index,slideDirection);
        },
        /**
         * 页面滑动实体方法
         * @param index
         * @param clickDirection
         * @private
         */
        _slideTo: function (index , slideDirection) {  //跳转到第index页
            if(this.touchLock || index === this.currentIndex) return;
            var _that = this;

            this.touchLock = true; //滑动过程中，加锁
            var nextPageBans;      //即将到来的下一页滑动限制
            //加载初始页面
            if(this.currentIndex === null){
                nextPageBans = this.config.noSlides[index]; //当前页面的滑动限制,若有限制，若只有一页，则去除提示上滑动态图
                if(this.pageListLength === 1 || nextPageBans === "noNext" || nextPageBans === "both"){
                    this.pageList[index].lastChild.style.visibility = "hidden";
                }
                this.setCurrent(this.pageList[index]);
                this.pageList[index].classList.add("ps-active-page");
                this.currentIndex = index;
                this.touchLock = false;
            }else{ //非初始页面
                this.nextPage = index;
                nextPageBans = this.config.noSlides[this.nextPage]; //即将到来页面的滑动限制,若有限制，则去除提示动态图
                switch (this.config.turnDirection) {
                    case "vertical":
                        if(typeof slideDirection !== "undefined"){ //点击跳转到下一页事件
                            switch (slideDirection){ //按钮的点击跳转处理,设置两个方向的初始位置
                                case "upToDown": //从上往下
                                    this.pageList[this.nextPage].style.cssText += this.doMove(-this.displayHeight) + "transition:none;";
                                    break;
                                case "downToUp": //从下往上
                                    this.pageList[this.nextPage].style.cssText += this.doMove(this.displayHeight) + "transition:none;";
                                    break;
                            }
                        }
                        //展示下一页，这里主要处理点击/长页面时，下一页还未setActive，已经setActive不影响
                        this.setActive(this.pageList[this.nextPage]);
                        //普通页滑动限制
                        if(nextPageBans === "noNext" || nextPageBans === "both"){
                            this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                        }
                        //最后一页滑动图标限制
                        if(this.nextPage === this.pageListLength - 1 && !this.config.canLoopPlay){
                            this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                        }
                        //异步，将下一页移到窗口前
                        setTimeout(function () {
                            _that.pageList[_that.nextPage].style.cssText += _that.doMove(0) + _that.getTransition();
                            _that.pageList[_that.currentIndex].style.cssText += _that.transformCurrentPage(_that.displayHeight * 0.18, "y", _that.config.speed);
                        },50);
                        break;
                    case "horizontal":
                        if(typeof slideDirection !== "undefined"){ //点击跳转到下一页事件
                            switch (slideDirection){ //按钮的点击跳转处理,设置两个方向的初始位置
                                case "leftToRight": //从左往右
                                    this.pageList[this.nextPage].style.cssText += this.doMove(-this.displayWidth, "x") + "transition:none;";
                                    break;
                                case "rightToLeft": //从右往左
                                    this.pageList[this.nextPage].style.cssText += this.doMove(this.displayWidth, "x") + "transition:none;";
                                    break;
                            }
                        }
                        //展示下一页，这里主要处理点击/长页面时，下一页还未setActive，已经setActive不影响
                        this.setActive(this.pageList[this.nextPage]);
                        //普通页滑动限制
                        if(nextPageBans === "noNext" || nextPageBans === "both"){
                            this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                        }
                        //最后一页滑动图标限制
                        if(this.nextPage === this.pageListLength - 1 && !this.config.canLoopPlay){
                            this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                        }
                        setTimeout(function () {
                            _that.pageList[_that.nextPage].style.cssText += _that.doMove(0, "x") + _that.getTransition();
                            _that.pageList[_that.currentIndex].style.cssText += _that.transformCurrentPage(_that.displayWidth * 0.18, "x", _that.config.speed);
                        },50);
                        break;
                }
                this.slideFinish();
            }
        },
        //滑动结束后的数据reset
        slideFinish: function () {
            var _that = this;
            setTimeout(function () {
                if(_that.isLongPage(_that.currentIndex)){
                    _that.pageList[_that.currentIndex].children[0].style.cssText += _that.doMove(0) + " transition:none;";
                }
                _that.longPageWantTurn = null; //重置翻页意图
                _that.resetPageAnimations(_that.pageList[_that.currentIndex].getAttribute("id"));
                _that.removeActive(_that.pageList[_that.nextPage]);
                _that.setCurrent(_that.pageList[_that.nextPage]);
                _that.removeCurrent(_that.pageList[_that.currentIndex]);
                if (_that.pageList[_that.currentIndex].style.cssText.indexOf("transform: scale(0.18)") >= 0) {
                    _that.pageList[_that.currentIndex].style.cssText += ";transform: scale(1);";
                }
                _that.pageList[_that.currentIndex].classList.remove("ps-active-page");
                _that.pageList[_that.nextPage].classList.add("ps-active-page");
                _that.currentIndex = _that.nextPage;
                _that.touchStartX = 0;
                _that.touchStartY = 0;
                _that.deltaX = 0;
                _that.deltaY = 0;
                _that.dy = 0;
                _that.bonus = 0;
                _that.nextPage = null;
                _that.touchLock = false;
                _that.involvedPage = -1;
                if(document.getElementById("ps-progress-bar")){
                    _that.drawProgressBar(); //绘制进度条
                }
                if(_that.config.viewType === "template" && !_that.utils.isInMobile()){
                    window.top.postMessage("#" + _that.currentIndex, "*");
                }
            },this.config.speed + 75);
        },
        resetPageAnimations: function (pageId) {
            var t = {};
            if (typeof this.config.animationSet === "object" && this.config.animationSet) {
                t = this.config.animationSet;
            } else if (typeof as === "object" && as){
                t = as;
            }
            for (var tmp in t){
                if(tmp.indexOf(pageId) >= 0){
                    this.addAnimation(tmp, 0);
                    this.animationPlayed[tmp] = 0;
                }
            }
        },
        initAnimation: function () {
            var that = this;
            var t = {};
            if (typeof this.config.animationSet === "object" && this.config.animationSet) {
                t = this.config.animationSet;
            } else if (typeof as === "object" && as){
                t = as;
            }
            for (var tmp in t){
                var ele = "#"+tmp;
                (function (ele) {
                    var eleChild = $(ele).children().eq(0);
                    $(eleChild).on('webkitAnimationEnd', function () {
                        var myId = $(ele).attr('id');
                        var alreadyPlayed = that.animationPlayed[myId];
                        if(t[myId][alreadyPlayed + 1]){
                            that.addAnimation(myId, alreadyPlayed + 1);
                            that.animationPlayed[myId] = alreadyPlayed + 1;
                        }
                    });
                }(ele));
                this.addAnimation(tmp, 0);
            }
        },
        //给section中元素添加根据配置添加动画
        addAnimation: function(eleId, index) {
            var t = {};
            if (typeof this.config.animationSet === "object" && this.config.animationSet) {
                t = this.config.animationSet;
            } else if (typeof as === "object" && as){
                t = as;
            }
            var liAnimations = t[eleId];
            var animation = liAnimations[index];
            if (animation) {
                var animationStr = '';
                if (animation[5]) {
                    animationStr = animation[1] + ' ' + animation[2] + 's ease ' + animation[3] + 's ' + 'infinite normal both'
                } else {
                    animationStr = animation[1] + ' ' + animation[2] + 's ease ' + animation[3] + 's ' + animation[4] + ' normal both'
                }
                var eleChild = $("#" + eleId).children().eq(0);
                $(eleChild).css('-webkit-animation', animationStr);
                this.animationPlayed[eleId] = index;
            }
        },
        //给包裹容器添加touch事件
        bindEvent: function () {
            var _that = this;
            this.wrapper.addEventListener('touchstart', function (e) {
                _that.touchStart(e);
            });
            this.wrapper.addEventListener('touchmove', function (e) {
                _that.touchMove(e);
                e.stopPropagation();
                e.preventDefault();
            });
            this.wrapper.addEventListener('touchend', function (e) {
                _that.touchEnd(e);
            });

            //PC端鼠标拖动
            this.wrapper.addEventListener('mousedown', function (e) {
                _that.touchStart(e);
                _that.mouseHasDown = true;
            });
            this.wrapper.addEventListener('mousemove', function (e) {
                if (_that.mouseHasDown){
                    e.preventDefault();
                    _that.touchMove(e);
                }

            });
            document.body.addEventListener('mouseup',function (e) {
                _that.touchEnd(e);
                _that.mouseHasDown = false;
            });
        },
        touchStart: function (e) {
            if(this.touchLock || this.longPageInScrolling) return;
            var touch = e.touches ? e.touches[0] : e ;
            this.touchStartY = touch.pageY;
            this.touchStartX = touch.pageX;
            this.touchStartTime = new Date().getTime();
            //如果当前页面是长页面，取得当前页面拉到最低的边界值
            if(this.isLongPage(this.currentIndex)){
                this.bonus = this.bonus || this.displayHeight - this.pageList[this.currentIndex].scrollHeight;
            }
        },
        touchMove: function (e) {
            //this.touchStartX <= 25 微信右滑返回事件
            if(this.touchLock || this.longPageInScrolling || (this.utils.isInMobile() && this.touchStartX <= 25)) return;
            var touch = e.touches ? e.touches[0] : e ;
            switch (this.config.turnDirection){
                case "vertical": //全局设置了上下翻页
                    if(this.touchStartY == 0) return;
                    if(this.isLongPage(this.currentIndex)){
                        //dy----- Y轴偏移值
                        //deltaY- 每次放手后的真实偏移量，没放手时不做赋值
                        this.dy = this.deltaY + (touch.pageY - this.touchStartY);
                        this.moveLongPage(this.dy);
                    }else{
                        this.deltaY = touch.pageY - this.touchStartY;
                        this.moveNormalPage();
                    }
                    break;
                case "horizontal": //全局设置了左右翻页
                    if(this.touchStartX === 0) return;
                    if(this.isLongPage(this.currentIndex)){
                        //dy----- Y轴偏移值
                        //计算滑动斜率gradient
                        var xAbs = Math.abs(touch.pageX - this.touchStartX);
                        var yAbs = Math.abs(touch.pageY - this.touchStartY);
                        var gradient = yAbs / xAbs;
                        if(this.longPageWantTurn !== false && ((xAbs >= 16 && yAbs <= 8) || (gradient <= 0.65 && xAbs >= 30))){
                            //有翻页意图
                            this.longPageWantTurn = true;
                            this.deltaX = touch.pageX - this.touchStartX;
                            this.moveNormalPage();
                        }else if(xAbs <= 8 && yAbs <= 8){ //暂时无法识别意图
                            this.longPageWantTurn = null;
                        }else if(this.longPageWantTurn !== true && (gradient > 0.64 || gradient === Infinity)){
                            //上下滚动意图
                            this.longPageWantTurn = false;
                            this.dy = this.deltaY + (touch.pageY - this.touchStartY);
                            this.moveLongPage(this.dy);
                        }
                    }else{
                        this.deltaX = touch.pageX - this.touchStartX;
                        this.moveNormalPage();
                    }
                    break;
            }
        },
        moveLongPage: function (dy) {
            switch (this.config.turnDirection) {
                case "vertical":
                    if((dy < 0 && dy > this.bonus) && this.longPageWantTurn !== true){
                        this.longPageWantTurn = false; //无翻页意图
                        this.nextPage = null;
                        this.pageList[this.currentIndex].children[0].style.cssText += this.doMove(dy) + "transition:none;";
                    }else if((dy >= 0 || dy <= this.bonus) && this.longPageWantTurn !== false){ //要引出上或下一页
                        this.longPageWantTurn = true; //有翻页意图
                        this.moveNormalPage();
                    }
                    break;
                case "horizontal":
                    if(dy < 0 && dy > this.bonus){ //上下滑动
                        this.pageList[this.currentIndex].children[0].style.cssText += this.doMove(dy) + "transition:none;";
                    }
                    else if(dy <= this.bonus){ //往上滑，到底了
                        this.pageList[this.currentIndex].children[0].style.cssText += this.doMove(this.bonus) + "transition:none;";
                    }
                    else{ //往下滑，去上一页
                        this.pageList[this.currentIndex].children[0].style.cssText += this.doMove(0) + "transition:none;";
                    }
                    break;
            }
        },
        /**
         * 缓动算法
         * @param duration
         */
        doForce: function (duration) {
            var that = this;

            this.longPageInScrolling = true;

            var lastYChange = this.dy - this.deltaY;

            var speed = (lastYChange / duration).toFixed(3);

            var finishTime = (Math.abs(speed / this.acceleration)).toFixed(3);

            var finishDis = (speed * finishTime / 1.8).toFixed(3); //本次滑动应该的实际缓动距离

            var t = Number(this.dy) + Number(finishDis);

            var cld = (t >= 0) ? 0 : (t >= this.bonus) ? t : this.bonus;

            this.dy = Number(this.dy) + Number(finishDis);
            this.pageList[this.currentIndex].children[0].style.cssText += this.doMove(cld) + "transition: -webkit-transform " + finishTime + "ms ease-out";
            setTimeout(function () {
                that.longPageInScrolling = false;
            }, finishTime / 2);

        },
        touchEnd: function () {
            if(this.touchLock || this.longPageInScrolling || (this.utils.isInMobile() && this.touchStartX <= 25)) return;//手指离开屏幕后，判断是否是就绪状态
            var currentPageBans = this.config.noSlides[this.currentIndex];
            switch (this.config.turnDirection){
                case "vertical": //全局设置了上下翻页
                    var _that = this;
                    if(this.isLongPage(this.currentIndex)){ //处理长页面

                        var duration1 = new Date().getTime() - this.touchStartTime; //松手时间差

                        if(duration1 > 30) this.doForce(duration1);

                        //先处理页面是否要跳转，再给deltaY重新赋值
                        this.deltaY = (this.dy >= 0) ? 0 : ((this.dy >= this.bonus) ? this.dy : this.bonus);
                        //松手后，识别滚动意图和翻页意图

                        this.longPageWantTurn = (this.deltaY === 0 || this.deltaY === this.bonus) ? true : null;
                        if(this.nextPage !== null){
                            this.slideRest();
                        }
                        this.touchLock = false;
                    }
                    else if(this.nextPage !== null){ //处理普通常规页面
                        (Math.abs(this.deltaY) <= this.displayHeight * this.config.triggerDist) ? this.slideRest() : (function () {
                            if(_that.deltaY > 0 && currentPageBans !== "noPrev" && currentPageBans !== "both"){
                                return _that._slideTo(_that.nextPage);
                            }
                            if(_that.deltaY < 0 && currentPageBans !== "noNext" && currentPageBans !== "both"){
                                return _that._slideTo(_that.nextPage);
                            }
                        }());
                    }
                    break;
                case "horizontal": //全局设置了左右翻页
                    if(this.isLongPage(this.currentIndex)){ //处理长页面

                        if(this.longPageWantTurn === false){ //有滚动意图松手
                            var duration2 = new Date().getTime() - this.touchStartTime; //松手时间差
                            if(duration2 > 30) this.doForce(duration2);
                        }else if(this.nextPage !== null){
                            this.slideRest(); //不恢复的话，如果翻页没达到触发值，会卡住
                        }
                        //先处理页面是否要跳转，再给deltaY重新赋值
                        this.deltaY = (this.dy >= 0) ? 0 : ((this.dy >= this.bonus) ? this.dy : this.bonus);
                        this.longPageWantTurn = null;//松手后，设为无意图状态
                        this.touchLock = false;
                    }
                    else if(this.nextPage !== null){ //处理常规页面
                        var _that = this;
                        (Math.abs(this.deltaX) <= this.displayWidth * this.config.triggerDist) ? this.slideRest() : (function () {
                            if(_that.deltaX > 0 && currentPageBans !== "noPrev" && currentPageBans !== "both"){
                                return _that._slideTo(_that.nextPage);
                            }
                            if(_that.deltaX < 0 && currentPageBans !== "noNext" && currentPageBans !== "both"){
                                return _that._slideTo(_that.nextPage);
                            }
                        }());
                    }
                    break;
            }
        },
        //清除滑动过程中涉及的上下页面
        dealInvolvePage: function(){
            if(this.involvedPage !== -1 && this.involvedPage !== null){
                this.removeActive(this.pageList[this.involvedPage]);
            }
        },
        moveNormalPage: function () {
            var currentPageBans = this.config.noSlides[this.currentIndex];//当前页的滑动限制
            switch (this.config.turnDirection){
                case "vertical":
                    if(this.deltaY < 0){ //往上滑，去下一页
                        if( this.currentIndex + 1 > this.pageListLength - 1){ //已经到了最后一张
                            this.nextPage = (this.pageListLength == 1) ? null : (this.config.canLoopPlay ? 0 : null);
                        }else{
                            this.nextPage = this.currentIndex + 1;
                        }
                        if(this.involvedPage !== this.nextPage){ //处理滑动涉及的两个页面残留高度的bug
                            this.dealInvolvePage();
                            this.involvedPage = this.nextPage;
                        }
                        if(this.nextPage !== null && currentPageBans !== "noNext" && currentPageBans !== "both"){ //下一张可滑，才滑动
                            this.setActive(this.pageList[this.nextPage]);
                            if(this.isLongPage(this.currentIndex)){ //长页面
                                if(this.deltaY - this.dy >= this.displayHeight * this.config.triggerDist){
                                    this._slideTo(this.nextPage);
                                }
                                this.pageList[this.nextPage].style.cssText += this.doMove(this.displayHeight + this.dy - this.deltaY) +"transition:none;";
                                this.pageList[this.currentIndex].style.cssText += this.transformCurrentPage(this.displayHeight + this.dy - this.deltaY);
                            }else{ //普通页面
                                if(Math.abs(this.deltaY) >= this.displayHeight * this.config.triggerDist){
                                    this._slideTo(this.nextPage);
                                }
                                this.pageList[this.nextPage].style.cssText += this.doMove(this.displayHeight + this.deltaY) +"transition:none;";
                                this.pageList[this.currentIndex].style.cssText += this.transformCurrentPage(this.displayHeight + this.deltaY);
                            }
                        }
                        this.longPageWantTurn = null;
                    }
                    else if(this.deltaY >= 0){//往下滑，去上一页
                        if(this.currentIndex - 1 < 0){ //已经是第一张
                            this.nextPage = (this.pageListLength == 1) ? null : (this.config.canLoopPlay ? this.pageListLength - 1 : null);
                        }else{
                            this.nextPage = this.currentIndex - 1;
                        }
                        if(this.involvedPage !== this.nextPage){ //处理滑动涉及的两个页面残留高度的bug
                            this.dealInvolvePage();
                            this.involvedPage = this.nextPage;
                        }
                        if(this.nextPage !== null && currentPageBans !== "noPrev" && currentPageBans !== "both") { //上一张可滑，才滑动

                            var nextPageBans = this.config.noSlides[this.nextPage];
                            if(this.isLongPage(this.nextPage)){ //判断的是即将出现的下一页
                                //这种情况处理跳转到长页面时，由于长页面的动态图的位置在最底部，还要考虑下一页长页面是否禁止了滑动
                                if(nextPageBans !== "noNext" && nextPageBans !== "both"){
                                    this.pageList[this.nextPage].lastChild.style.top = this.upIconPosition + "px";
                                }else{
                                    this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                                }
                            }else{ //常规页面的前一页也设定了不允许往后滑的情况
                                if(nextPageBans === "noNext" || nextPageBans === "both"){
                                    this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                                }
                            }
                            this.setActive(this.pageList[this.nextPage]);
                            if(this.isLongPage(this.currentIndex)){
                                this.longPageWantTurn = true;
                                if(this.dy >= this.displayHeight *  this.config.triggerDist){
                                    this._slideTo(this.nextPage);
                                }
                                this.pageList[this.nextPage].style.cssText += this.doMove(-(this.displayHeight - this.dy)) + "transition:none;";
                                this.pageList[this.currentIndex].style.cssText += this.transformCurrentPage(-(this.displayHeight - this.dy));
                            }else{
                                if(Math.abs(this.deltaY) >= this.displayHeight *  this.config.triggerDist){
                                    this._slideTo(this.nextPage);
                                }
                                this.pageList[this.nextPage].style.cssText += this.doMove(-(this.displayHeight - this.deltaY)) + "transition:none;";
                                this.pageList[this.currentIndex].style.cssText += this.transformCurrentPage(-(this.displayHeight - this.deltaY));
                            }
                        }
                        this.longPageWantTurn = null;
                    }
                    break;
                case "horizontal":
                    if(this.deltaX < 0 ){ //往左滑，去下一页
                        if(this.currentIndex + 1 > this.pageListLength - 1){ //已经到了最后一张
                            this.nextPage = (this.pageListLength == 1) ? null : (this.config.canLoopPlay ? 0 : null);
                        }else{
                            this.nextPage = this.currentIndex + 1;
                        }
                        if(this.involvedPage !== this.nextPage){ //处理滑动涉及的两个页面残留宽度的bug
                            this.dealInvolvePage();
                            this.involvedPage = this.nextPage;
                        }
                        if(this.nextPage !== null && currentPageBans !== "noNext" && currentPageBans !== "both"){ //下一张可滑，才滑动
                            this.setActive(this.pageList[this.nextPage]);
                            if(Math.abs(this.deltaX) >= this.displayWidth * this.config.triggerDist){
                                this._slideTo(this.nextPage);
                            }
                            this.pageList[this.nextPage].style.cssText += this.doMove(this.displayWidth + this.deltaX, "x") + "transition:none;";
                            this.pageList[this.currentIndex].style.cssText += this.transformCurrentPage(this.displayWidth + this.deltaX, "x");
                        }
                    }
                    else if(this.deltaX > 0){ //往右滑，去上一页
                        if(this.currentIndex - 1 < 0){ //已经是第一张
                            this.nextPage = (this.pageListLength == 1) ? null : (this.config.canLoopPlay ? this.pageListLength - 1 : null);
                        }else{
                            this.nextPage = this.currentIndex - 1;
                        }
                        if(this.involvedPage !== this.nextPage){ //处理滑动涉及的两个页面残留高度的bug
                            this.dealInvolvePage();
                            this.involvedPage = this.nextPage;
                        }
                        if(this.nextPage !== null && currentPageBans !== "noPrev" && currentPageBans !== "both") { //上一张可滑，才滑动
                            var nextPageBans = this.config.noSlides[this.nextPage];
                            //如果前一页也设定了不允许往下一页滑的情况
                            if(nextPageBans === "noNext" || nextPageBans === "both"){
                                this.pageList[this.nextPage].lastChild.style.visibility = "hidden";
                            }
                            this.setActive(this.pageList[this.nextPage]);
                            if(Math.abs(this.deltaX) >= this.displayWidth * this.config.triggerDist){
                                this._slideTo(this.nextPage);
                            }
                            this.pageList[this.nextPage].style.cssText += this.doMove(-(this.displayWidth - this.deltaX), "x") + "transition:none;";
                            this.pageList[this.currentIndex].style.cssText += this.transformCurrentPage(this.displayWidth - this.deltaX, "x");
                        }
                    }else
                        this.removeActive(this.pageList[this.nextPage]);
                    break;
            }
        },
        slideRest: function () {
            var _that = this;
            this.touchLock = true; //恢复过程中，加锁
            switch (this.config.turnDirection){
                case "vertical": //全局设置了上下翻页
                    this.longPageWantTurn = true;
                    this.doPageRestAnimation(); //退回去的动画设置
                    setTimeout(function () {
                        _that.removeActive(_that.pageList[_that.nextPage]);
                        _that.pageList[_that.nextPage].style.cssText += _that.doMove(0);
                        if(!_that.isLongPage(_that.currentIndex)){
                            _that.deltaY = 0;
                            _that.dy = 0;
                        }
                        _that.longPageWantTurn = null;
                        _that.touchStartY = 0;
                        _that.nextPage = null;
                        _that.touchLock = false;
                    },this.config.speed);
                    break;
                case "horizontal": //全局设置了左右翻页
                    this.doPageRestAnimation();
                    setTimeout(function () {
                        _that.removeActive(_that.pageList[_that.nextPage]);
                        _that.pageList[_that.nextPage].style.cssText += _that.doMove(0, "x");
                        _that.touchStartX = 0;
                        _that.deltaX = 0;
                        _that.nextPage = null;
                        _that.touchLock = false;
                        _that.longPageWantTurn = null;
                    },this.config.speed);
                    break;
            }
        },
        doPageRestAnimation: function () {
            var isLongPage = this.isLongPage(this.currentIndex);
            switch (this.config.turnDirection) { //下一页统一退回去
                case "vertical":
                    if((!isLongPage && this.deltaY >= 0) || (isLongPage && this.deltaY !== this.bonus)){ //上一页还没拉下来，复原回去
                        this.pageList[this.nextPage].style.cssText += this.doMove(-this.displayHeight) + this.getTransition();
                    }else{  //下一页还没拉上来，复原回去
                        this.pageList[this.nextPage].style.cssText += this.doMove(this.displayHeight) + this.getTransition();
                    }
                    break;
                case "horizontal":
                    if(this.deltaX >= 0){ //上一页还没拉到右边来，复原回去
                        this.pageList[this.nextPage].style.cssText += this.doMove(-this.displayWidth, "x") + this.getTransition();
                    }else{  //下一页还没拉到左边来，复原回去
                        this.pageList[this.nextPage].style.cssText += this.doMove(this.displayWidth, "x") + this.getTransition();
                    }
                    break;
            }
            switch (this.config.turnEffect) {
                case "inertia": //惯性翻页
                    this.pageList[this.currentIndex].style.cssText += "; -webkit-transition: -webkit-transform " + this.config.speed + "ms linear; -webkit-transform:scale(1);";
                    break;
                default: //默认翻页

            }
        },
        //获取当前页面index
        getCurrentIndex: function () {
            return this.currentIndex === null ? this.config.startIndex : this.currentIndex;
        },
        //用户事件，跳转到下一页
        slideToNext: function () {
            var index = null;
            var canLoopPlay = (this.config.viewType === "template") ? true : this.config.canLoopPlay;
            if( this.currentIndex + 1 > this.pageListLength - 1){ //已经到了最后一张
                index = canLoopPlay ? 0 : null;
            }else{
                index = this.currentIndex + 1;
            }
            if(index !== null){
                this.slideTo(index, 1);
            }
        },
        //用户事件，跳转到上一页
        slideToPrev: function () {
            var index = null;
            var canLoopPlay = (this.config.viewType === "template") ? true : this.config.canLoopPlay;
            if(this.currentIndex - 1 < 0){ //已经是第一张
                index = canLoopPlay ? this.pageListLength - 1 : null;
            }else{
                index = this.currentIndex - 1;
            }
            if(index !== null){
                this.slideTo(index, -1);
            }
        },
        setCurrent: function (ele) {
            if(ele)
                ele.style.display = "inline-block";
        },
        setActive: function (ele) {
            if(ele) {
                ele.style.display = "inline-block";
                ele.style.zIndex = 2;
            }
        },
        removeCurrent: function (ele) {
            if(ele)
                ele.style.display = "none";
        },
        removeActive: function (ele) {
            if(ele){
                ele.style.zIndex = 1;
                ele.style.display = "none";
            }
        },
        queryElement: function (s) {
            var arr = [];
            if(s && s.indexOf("#") >= 0){
                arr.push(document.getElementById(s.substring(1)));
                return arr;
            }
            return document.getElementsByClassName(s.substring(1));
        },
        doMove: function (dist, direction) {
            if(direction === "x")
                return "; -webkit-transform:translate3d(" + dist + "px,0,0);";
            return "; -webkit-transform:translate3d(0," + dist + "px,0);";
        },
        transformCurrentPage: function (dist, direction, time) {
            //time参数用于_slide滑动过程中的动画时间，页面间拉动过程中，不需要时间参数
            var transition = ";-webkit-transition:none;";
            if(typeof time !== 'undefined'){
                transition = transition.replace("none","-webkit-transform " + time + "ms linear");
            }
            //设置两种翻页方向的转向初始角度
            var transformOriginY = "transform-origin:center top 0;";
            var transformOriginX = "transform-origin:left center 0;";
            var transform = "-webkit-transform:";
            if(direction === "x"){
                if(this.deltaX > 0){
                    transformOriginX = transformOriginX.replace("left", "right");
                }
                switch (this.config.turnEffect){
                    case "inertia": //惯性翻页
                        var rateX = Math.abs(dist / this.displayWidth).toFixed(3);
                        return transition + transformOriginX + "-webkit-transform:scale(" + rateX + ");";
                        break;
                    default: //默认翻页，返回本页动画为空
                        return "";
                }
            }else{
                if(this.deltaY > 0 || (this.isLongPage(this.currentIndex) && this.deltaY === 0)){
                    transformOriginY = transformOriginY.replace("top", "bottom");
                }
                switch (this.config.turnEffect){
                    case "inertia": //惯性翻页
                        var rateY = Math.abs(dist / this.displayHeight).toFixed(3);
                        return transition + transformOriginY + transform + "scale(" + rateY + ");";
                        break;
                    default: //默认翻页，返回本页动画为空
                        return "";
                }
            }
        },
        getTransition: function () {
            return "-webkit-transition: -webkit-transform " + this.config.speed + "ms linear";
        },
        isLongPage: function (n) {
            var len = this.config.longPages.length;
            for(var i = 0; i < len; i++){
                if(n == this.config.longPages[i])
                    return true;
            }
            return false;
        },
        utils: {
            isInMobile: function () {
                return (/Android|webOS|iPhone|ios|iPod|ipad|motorola|huawei|novarra|CoolPad|samsung|ucweb|windows phone|windows ce|midp|smartphone|symbian|BlackBerry|PlayBook|BB10/i.test(navigator.userAgent)) ? true : false;
            },
            getQueryString: function (name) {
                var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
                var r = window.location.search.substr(1).match(reg);
                if(r!=null) return unescape(r[2]);
                return null;
            }
        }
    };

    //兼容模块
    if(typeof module === 'object' && typeof module.exports === 'object'){
        module.exports = PSlider;
    } else if(typeof define === 'function' && (define.amd || define.cmd)){
        define(function(){
            return PSlider;
        })
    }else{ window.PSlider = PSlider; }
}());
