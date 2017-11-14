/**
 * pSlider 多性能滑动组件（垂直版）
 * @class  pSlider
 * @param  conf
 * @author Rowbiy
 * @date   2017-10-28
 * @param  conf.wrapper='#ps-wrapper' 容器
 * @param  conf.mainPage='.main-page'  滚动单元的元素
 * @param  conf.startIndex=0 设置初始显示的页码
 * @param  conf.speed=400 动画速度 单位:ms
 * @param  conf.triggerDist=40 触发滑动的手指移动最小位移 单位:像素
 * @param  conf.canLoopPlay=true 是否允许循环滑动，默认允许
 *
 * //极简用法
 * new pSlider(); //容器默认是 #ps-wrapper  元素默认是 .main-page
 *
 * //一般用法
 * var ps = new pSlider({
 *      wrapper:'#container',
 *      mainPage:'.main-p'
 * });
 *
 * longPages: 若页面中存在长页面，需要指定所有长页面的页码，从0开始
 *
 * noSlides: 设置某些页面不可以滑动，不允许滑动方式分3三种，需要指出"noPrev" | "noNext" | "both"，必须
 *
 * //滑动到指定页码,第一个参数为页码，第二参数为滑动方式 ["upToDown"  |  "downToUp"]，必须
 * ps.slideTo(2,"upToDown");
 *
 */

function pSlider(conf) {

    this.config={
        wrapper:'#ps-wrapper',
        mainPage:'.main-page',
        startIndex:0,            //启动页面
        speed:400,               //滑屏速度 单位:ms
        triggerDist:50,          //触发滑动的手指移动最小位移 单位:像素
        canLoopPlay:false,       //是否允许循环滑动
        longPages:[],            //长页面
        noSlides:{}              //不允许滑动的页面,noPrev表示不允许下滑去上一页，noNext表示不允许上滑去下一页，both表示上下滑均不可
    };
    for (var i in conf) {
        this.config[i]=conf[i];
    }
    this.init();
}

pSlider.prototype = {
    wrapper: null,               //页面包裹元素
    pageList: null,              //所有要滑动的页面元素
    touchStartY: 0,              //每次滑动的第一个接触点的Y坐标
    touchLock: false,            //防止暴力滑动
    deltaY: 0,                   //在每个页面上相对于第一个触点的后续Y轴滑动偏移量
    displayHeight: 0,            //滑动区域main-page高度
    pageListLength: 0,           //滑块的个数
    currentIndex: null,          //当前展示页面是谁，下标
    nextPage: null,              //后一页是谁，下标
    mouseHasDown: false,         //如果是pc端，判断鼠标有没有点下
    bonus: 0,                    //长页面的相比视口的偏移值，负数
    dy: 0,                       //长页面每次拖动时形成的偏移
    involvedPage: -1,            //每次滑动时，涉及的上个页面，下标
    touchStartTime:0,            //记录滑动时，touchStart时间
    acceleration:0.0058,         //默认缓动加速度值
    upIconPosition:0,            //向上箭头的初始位置

    init: function () {

        this.index = this.config.index || 0;

        this.wrapper = this.queryElement(this.config.wrapper)[0];
        if (!this.wrapper) {
            throw Error('"wrap" param can not be empty!');
            return ;
        }
        var ani = "@-webkit-keyframes start {0%, 30% {opacity: 0;transform: translateY(10px);} 60% {opacity: 1;transform: translate(0);} 100% {opacity: 0;transform: translateY(-12px);}}";

        if(document.getElementsByTagName("style").length){
            document.getElementsByTagName("style")[0].innerHTML += ani;
        }else{
            var style = document.createElement("style");
            style.innerHTML = ani;
            document.getElementsByTagName("head")[0].appendChild(style);
        }

        this.wrapper.style.cssText += "; position: absolute;width: 100%;height: 100%;overflow: hidden;background: #fff;";
        this.displayHeight = this.wrapper.clientHeight;
        this.upIconPosition = this.displayHeight - 45;
        this.pageList = this.queryElement(this.config.mainPage);
        this.pageListLength = this.pageList.length;
        //只有一张滑块的时候，不允许循环滑动
        this.config.canLoopPlay = (this.pageListLength === 1) ? false : this.config.canLoopPlay;

        for (var i = 0; i < this.pageListLength; i++) {
            this.pageList[i].style.cssText += '; display:none;position:absolute;height:100%;overflow:hidden;width:100%;z-index: 1;-webkit-box-orient: vertical;background-color:#fff';
            var img = document.createElement("img");
            img.setAttribute("src","data:image/png;base64,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");
            img.style.cssText += "; position:absolute;top:"+ this.upIconPosition + "px;left:50%;width:26px;height:26px;margin-left:-13px;z-index:999;-webkit-animation: start 1.5s infinite ease-in-out";
            this.pageList[i].appendChild(img);
        }

        this.bindEvent();

        this.slideTo(this.config.startIndex);
    },

    getCurrentIndex: function () { //获取当前页面index

        return this.currentIndex === null ? this.config.startIndex : this.currentIndex;
    },

    slideToNext: function () { //用户事件，跳转到下一页
        var index = null;
        if( this.currentIndex + 1 > this.pageListLength - 1){ //已经到了最后一张
            index = this.config.canLoopPlay ? 0 : null;
        }else{
            index = this.currentIndex + 1;
        }
        if(index !== null){
            this.slideTo(index , "downToUp");
        }
    },
    slideToPrev: function () { //用户事件，跳转到上一页
        var index = null;
        if(this.currentIndex - 1 < 0){ //已经是第一张
            index = this.config.canLoopPlay ? this.pageListLength - 1 : null;
        }else{
            index = this.currentIndex - 1;
        }
        if(index !== null){
            this.slideTo(index , "upToDown");
        }
    },

    slideTo: function (index , clickDirection) {  //跳转到第index页

        if(this.touchLock || index === this.currentIndex) return;

        var _that = this;
        index = (index >= 0 && index < this.pageListLength) ? index : 0;

        this.touchLock = true; //滑动过程中，加锁

        var bans;

        //加载初始页面
        if(this.currentIndex === null){

            bans = this.config.noSlides[0]; //当前页面的滑动限制,若有限制，则去除提示上滑动态图
            if(bans === "noNext" || bans === "both"){
                this.pageList[index].lastChild.style.visibility = "hidden";
            }
            this.setCurrent(this.pageList[index]);
            this.currentIndex = index;
            this.touchStartY = 0;
            this.deltaY = 0;
            this.nextPage = null;
            this.bonus = 0;
            this.dy = 0;
            this.involvedPage = -1;
            this.touchLock = false;

            if(this.isArrayContain(this.currentIndex)){ //如果当前页面是长页面，需要展示全部
                this.pageList[this.currentIndex].style.overflow = "visible";
            }

        }else{ //非初始页面

            this.nextPage = index;

            bans = this.config.noSlides[index]; //当前页面到滑动限制,若有限制，则去除提示动态图

            if(this.isArrayContain(this.nextPage)){ //这种情况处理【按钮】跳转到长页面时，由于长页面还未初始化，后面有代码设置overflow但是不起作用
                if(bans !== "noNext" && bans !== "both"){
                    this.pageList[this.nextPage].lastChild.style.top = this.upIconPosition + "px";
                }
                this.pageList[this.nextPage].style.cssText += "; height:" + this.displayHeight + ";overflow:hidden";
            }

            switch (clickDirection){ //按钮的点击跳转处理,两个方向的滑动
                case "upToDown": //从上往下
                    this.pageList[this.nextPage].style.cssText += this.getTransform(-this.displayHeight) + "transition:none;";
                    break;
                case "downToUp": //从下往上
                    this.pageList[this.nextPage].style.cssText += this.getTransform(this.displayHeight) + "transition:none;";
                    break;
            }


            if(this.isArrayContain(this.currentIndex)){

                if(this.deltaY >= 0){ //去上一页
                    this.pageList[this.nextPage].style.cssText += this.getTransform(-this.displayHeight) + "transition:none;";
                }else{
                    this.pageList[this.nextPage].style.cssText += this.getTransform(this.displayHeight) + "transition:none;";
                }
            }
            //普通页滑动限制
            if(bans === "noNext" || bans === "both"){
                this.pageList[index].lastChild.style.visibility = "hidden";
            }
            //最后一页滑动图标限制
            if(this.nextPage === this.pageListLength - 1 && !this.config.canLoopPlay){
                this.pageList[index].lastChild.style.visibility = "hidden";
            }
            this.setActive(this.pageList[this.nextPage]);

            setTimeout(function () {
                _that.pageList[_that.nextPage].style.cssText += _that.getTransform(0) + _that.getTransition();
            },25);
            setTimeout(function () {
                if(_that.isArrayContain(_that.currentIndex)){
                    //如果当前页面是长页面，在它消失前设置overflow，为后面显示裁剪好高度
                    _that.pageList[_that.currentIndex].style.overflow = "hidden";
                }
                _that.removeCurrent(_that.pageList[_that.currentIndex]);
                _that.removeActive(_that.pageList[_that.nextPage]);
                _that.setCurrent(_that.pageList[_that.nextPage]);
                _that.currentIndex = _that.nextPage;
                _that.touchStartY = 0;
                _that.deltaY = 0;
                _that.nextPage = null;
                _that.bonus = 0;
                _that.dy = 0;
                _that.touchLock = false;
                _that.involvedPage = -1;
                if(_that.isArrayContain(_that.currentIndex)){ //如果当前页面是长页面，由于前面的处理中已经裁剪了，需要展示全部
                    _that.pageList[_that.currentIndex].style.overflow = "visible";
                }
            },450);
        }
    },

    bindEvent: function () {
        var _that = this;
        this.wrapper.addEventListener('touchstart',function (e) {
            _that.touchStart(e);
        });
        this.wrapper.addEventListener('touchmove',function (e) {
            _that.touchMove(e);
            e.stopPropagation();
            e.preventDefault(); //禁止上下拉露黑底
        });
        this.wrapper.addEventListener('touchend',function (e) {
            _that.touchEnd(e);
        });

        //PC端鼠标拖动
        this.wrapper.addEventListener('mousedown',function (e) {
            _that.touchStart(e);
            _that.mouseHasDown = true;
        },true);
        this.wrapper.addEventListener('mousemove',function (e) {
            if (_that.mouseHasDown)
                _that.touchMove(e);
        },true);
        document.body.addEventListener('mouseup',function (e) {
            _that.touchEnd(e);
            _that.mouseHasDown = false;
        },true);
    },


    touchStart: function (e) {
        if(this.touchLock) return;
        var touch = e.touches ? e.touches[0] : e ;
        this.touchStartY = touch.pageY;
        this.touchStartTime = new Date().getTime();
    },


    touchMove: function (e) {

        if(this.touchLock || this.touchStartY == 0) return;
        var touch = e.touches ? e.touches[0] : e ;

        if(this.isArrayContain(this.currentIndex)){
            //取得当前页面拉到最低到边界值
            this.bonus = this.bonus || this.displayHeight - this.pageList[this.currentIndex].scrollHeight;
            //dy----- Y轴偏移值
            //deltaY- 每次放手后到真实偏移量，没放手时不做赋值
            this.dy = this.deltaY + (touch.pageY - this.touchStartY);

            this.moveLongPage(this.dy);

        }else{
            this.deltaY = touch.pageY - this.touchStartY;
            this.moveNormalPage();
        }
    },

    moveLongPage: function (dy) {

        var bans = this.config.noSlides[this.currentIndex];

        if(dy < 0 && dy > this.bonus){

            if(bans !== "noNext" && bans !== "both"){
                this.pageList[this.currentIndex].lastChild.style.top = (this.upIconPosition - dy) + "px";
            }
            this.pageList[this.currentIndex].style.cssText += this.getTransform(dy) + "transition:none;";

        }
        else if(dy <= this.bonus){ //往上滑，去下一页
            console.log("-long page end-");
            this.pageList[this.currentIndex].style.cssText += this.getTransform(this.bonus) + "transition:none;";
        }
        else{ //往下滑，去上一页
            this.pageList[this.currentIndex].style.cssText += this.getTransform(0) + "transition:none;";
        }
    },

    doForce: function (duration) {

        var lastYChange = this.dy - this.deltaY;

        var speed = (lastYChange / duration).toFixed(3);


        var finishTime = (Math.abs(speed / this.acceleration)).toFixed(3);


        var finishDis = (speed * finishTime / 2).toFixed(3); //本次滑动应该的实际缓动距离

        var t = Number(this.dy) + parseInt(finishDis);

        var cld = (t >= 0) ? 0 : (t >= this.bonus) ? t : this.bonus;

        this.dy = Number(this.dy) + parseInt(finishDis);

        this.pageList[this.currentIndex].style.cssText += this.getTransform(cld) + "transition: -webkit-transform " + finishTime + "ms ease-out";
        this.pageList[this.currentIndex].lastChild.style.top = (this.upIconPosition - cld) + "px";

    },
    touchEnd: function () { //手指离开屏幕后，判断是否可以滑动

        if(this.touchLock) return;

        var bans = this.config.noSlides[this.currentIndex];

        if(this.isArrayContain(this.currentIndex)){ //处理长页面

            var duration1 = new Date().getTime() - this.touchStartTime; //松手时间差

            if(duration1 > 30) this.doForce(duration1);

            if(this.deltaY == 0 && this.dy > this.config.triggerDist){
                if(this.currentIndex - 1 < 0){ //已经是第一张
                    this.nextPage = this.config.canLoopPlay ? this.pageListLength - 1 : null;
                }else{
                    this.nextPage = this.currentIndex - 1;
                }
                if(this.nextPage !== null && bans !== "noPrev" && bans !== "both") { //上一张可滑，才滑动
                    this.slideTo(this.nextPage);
                }
            }
            else if(this.deltaY == this.bonus && this.dy < this.bonus - this.config.triggerDist){ //往上滑，去下一页
                if( this.currentIndex + 1 > this.pageListLength - 1){ //已经到了最后一张
                    this.nextPage = this.config.canLoopPlay ? 0 : null;
                }else{
                    this.nextPage = this.currentIndex + 1;
                }
                if(this.nextPage !== null && bans !== "noNext" && bans !== "both"){ //下一张可滑，才滑动
                    this.slideTo(this.nextPage);
                }
            }
            //先处理页面是否要跳转，再给deltaY重新赋值
            this.deltaY = (this.dy >= 0) ? 0 : ((this.dy >= this.bonus) ? this.dy : this.bonus);
        }
        else if(this.nextPage !== null){ //处理普通常规页面

            var bans = this.config.noSlides[this.currentIndex],
                _that = this;

            (Math.abs(this.deltaY) <= this.config.triggerDist) ? this.slideRest() : (function () {

                if(_that.deltaY > 0 && bans !== "noPrev" && bans !== "both"){
                    return _that.slideTo(_that.nextPage);
                }
                if(_that.deltaY < 0 && bans !== "noNext" && bans !== "both"){
                    return _that.slideTo(_that.nextPage);
                }
            }());
        }

    },
    dealInvolvePage: function(){

        if(this.involvedPage !== -1 && this.involvedPage !== null){
            this.removeActive(this.pageList[this.involvedPage]);
        }
    },
    moveNormalPage: function () {

        var bans = this.config.noSlides[this.currentIndex];

        if(this.deltaY < 0 ){ //往上滑，去下一页


            if( this.currentIndex + 1 > this.pageListLength - 1){ //已经到了最后一张
                this.nextPage = this.config.canLoopPlay ? 0 : null;
            }else{
                this.nextPage = this.currentIndex + 1;
            }

            if(this.involvedPage !== this.nextPage){ //处理滑动涉及的两个页面残留高度的bug
                this.dealInvolvePage();
                this.involvedPage = this.nextPage;
            }

            if(this.nextPage !== null && bans !== "noNext" && bans !== "both"){ //下一张可滑，才滑动
                this.setActive(this.pageList[this.nextPage]);
                this.pageList[this.nextPage].style.cssText += this.getTransform(this.displayHeight + this.deltaY) +"transition:none;";
            }

        }

        else if(this.deltaY > 0){//往下滑，去上一页

            if(this.currentIndex - 1 < 0){ //已经是第一张
                this.nextPage = this.config.canLoopPlay ? this.pageListLength - 1 : null;

            }else{
                this.nextPage = this.currentIndex - 1;
            }

            if(this.involvedPage !== this.nextPage){ //处理滑动涉及的两个页面残留高度的bug
                this.dealInvolvePage();
                this.involvedPage = this.nextPage;
            }

            if(this.nextPage !== null && bans !== "noPrev" && bans !== "both") { //上一张可滑，才滑动

                var nextPageBans = this.config.noSlides[this.nextPage];

                if(this.isArrayContain(this.nextPage)){ //这种情况处理跳转到长页面时，由于长页面的动态图的位置在最底部，还要考虑下一页长页面是否禁止了滑动

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
                this.pageList[this.nextPage].style.cssText += this.getTransform(-(this.displayHeight - this.deltaY)) + "transition:none;";
            }
        }else{
            this.removeActive(this.pageList[this.nextPage]);
        }
    },




    slideRest: function () {

        var _that = this;
        if(this.deltaY > 0 ){ //上一页还没拉下来，复原回去

            this.pageList[this.nextPage].style.cssText += this.getTransform(-this.displayHeight) + this.getTransition();

            setTimeout(function () {

                _that.removeActive(_that.pageList[_that.nextPage]);
                _that.pageList[_that.nextPage].style.cssText += _that.getTransform(0);
                _that.touchStartY = 0;
                _that.deltaY = 0;
                _that.nextPage = null;
            },400);

        }else{  //下一页还没拉上来，复原回去

            this.pageList[this.nextPage].style.cssText += this.getTransform(this.displayHeight) + this.getTransition();
            setTimeout(function () {
                _that.removeActive(_that.pageList[_that.nextPage]);
                _that.pageList[_that.nextPage].style.cssText += _that.getTransform(0);
                _that.touchStartY = 0;
                _that.deltaY = 0;
                _that.nextPage = null;
            },400);

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

    getTransform: function (dist) {
        var pos= '0px,'+dist;
        return "; -webkit-transform:translate3d(" + pos + "px,0px);";
    },
    getTransition: function () {
        return "transition: -webkit-transform " + this.config.speed + "ms ease-in";
    },
    isArrayContain: function (n) {
        var len = this.config.longPages.length;
        for(var i = 0; i < len; i++){
            if(n == this.config.longPages[i])
                return true;
        }
        return false;
    }
};

if (typeof module == 'object') {
    module.exports = pSlider;
}else {
    window.pSlider = pSlider;
}