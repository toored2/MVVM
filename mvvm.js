//  观察者 （发布订阅）  观察者  被观察者

class Dep {
    constructor () {
        this.subs = [] //存放所有watcher
    }

    //订阅
    addSub (watcher) { //添加watcher
        this.subs.push(watcher)
    }

    //发布
    notify () {
        this.subs.forEach(watcher => watcher.update())
    }
}


//new  Watcher
class Watcher {
    constructor (vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        //默认先存放一个老值
        this.oldValue = this.get()
    }

    get () { //vm.$data.school   vm.$data.school.name
        Dep.target = this; //先把自己放在this上
        //取值  把这个观察者 和数据关联起来
        let value = CompilerUtil.getVal(this.vm, this.expr)
        Dep.target = null //不取消 任何值取值 都会添加watcher
        return value
    }

    update () {//更新操作 数据变化后 会调用观察者的update方法
        let newVal = CompilerUtil.getVal(this.vm, this.expr)
        if (newVal !== this.oldValue) {
            this.cb(newVal)
        }

    }
}

// vm.$watch(vm, 'school.name',(newVal)=>{
//
// })


//实现数据额劫持功能
class Observer {
    constructor (data) {
        console.log()
        this.observer(data)
    }

    observer (data) {
        //如果是对象才观察
        if (data && typeof data == 'object') {
            //如果是对象
            for (let key in data) {
                this.defineReactive(data, key, data[key])
            }
        }
    }

    defineReactive (obj, key, value) {
        this.observer(value) //深度递归  school:[watcher,watcher] b:[watcher]
        let dep = new Dep() //给每一个属性 都加上一个具有发布和订阅的动能
        Object.defineProperty(obj, key, {
            get () {
                //创建watcher 时 会取到对应的内容，并且把watcher放到了全局上
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => { // {school:{name:'珠峰'}}   school={}
                if (newVal != value) {
                    this.observer(newVal)
                    value = newVal
                    dep.notify()
                }
            }
        })
    }
}


//基类  调度

class Compiler {
    constructor (el, vm) {
        // el 有可能是'#app' 也有可能是 document.getElementById('app')
        //判断el属性，是不是一个元素，如果不是元素，那就获取它
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        // console.log(this.el)

        //把当前节点中的元素 获取到 放入内存中

        this.vm = vm;

        let fragment = this.node2fragment(this.el)
        // console.log(fragment)

        //把节点中的内容进行替换


        //编译模板

        this.compile(fragment)


        //把内容塞到页面中

        this.el.appendChild(fragment)

    }


    isDirective (attrName) {
        return attrName.startsWith('v-')

    }


    //编译元素的
    compileElement (node) {
        // console.log('node==========',node)
        let attributes = node.attributes //类数组
        // console.log('1111----',attributes)

        attributes = Array.prototype.slice.call(attributes)
        // console.log('22222----',attributes)


        attributes.forEach((attr) => {
            //attr  是  type="text" v-model="school.name"
            // console.log(attr)
            let {name, value: expr} = attr //v-model='school.name'
            // console.log('name:',name,'value:',value)

            //判断是不是指令
            //v-model  v-html v-bind
            if (this.isDirective(name)) {
                let [, directive] = name.split('-') //v-on:click
                let [directiveName, eventName] = directive.split(':')

                //需要调用不同的指令来处理
                CompilerUtil[directiveName](node, expr, this.vm, eventName)

                // console.log('指令node----',node)

            }
        })
    }

    //编译文本的
    //判断当前文本节点中的内容是否包含{{xxx}} {{aaa}}
    compileText (node) {
        let content = node.textContent
        // console.log('content---',content)
        if (/\{\{(.+?)\}\}/.test(content)) { //匹配大括号中间的文本
            // console.log(content, 'text') //找到所有文本
            //文本节点
            CompilerUtil['text'](node, content, this.vm) //{{a}} {{b}}
        }
    }

    //核心编译方法
    //用来编译内存中的dom节点
    compile (node) {
        let childNodes = node.childNodes

        childNodes = Array.prototype.slice.call(childNodes)


        childNodes.forEach(child => { //编译模板中带有v- 和 {{}}的
            if (this.isElementNode(child)) { //元素节点 v-
                // console.log('element',child)
                this.compileElement(child)
                //如果是元素的话 需要把自己传进去 再去遍历子节点
                this.compile(child)
            } else {
                // console.log('text',child)
                this.compileText(child)
            }

        })

        // console.log(childNodes)

    }


    //把节点移动到内存中
    node2fragment (node) {
        //创建一个文档碎片
        let fragment = document.createDocumentFragment()
        let firstChild;
        while (firstChild = node.firstChild) { //node.firstChild一直拿到#app的第一个子节点
            // console.log(firstChild)
            //appendChild具有移动性
            fragment.appendChild(firstChild)
        }
        return fragment
    }

    isElementNode (node) { //是不是元素节点
        return node.nodeType === 1;
    }

}


CompilerUtil = {
    // 根据表达式，取到对应的数据
    getVal (vm, expr) { //vm.$data  'school.name'  [school,name]
        // console.log('vm.$data================',vm.$data)
        // console.log('expr================',expr)
        // console.log('expr.split(\'.\')================',expr.split('.'))
        let arr = expr.split('.')


        return arr.reduce((data, current) => {
            // console.log('data----',data)
            // console.log('current----',current)

            return data[current] //先取到vm.$data.school ,返回的值作为下一次的data

        }, vm.$data)

    },
    setValue (vm, expr, value) { //vm.$data 'school.name'
        expr.split('.').reduce((data, current, index, arr) => {
            if (index == arr.length - 1) {
                return data[current] = value

            }
            return data[current]

        }, vm.$data)
    },


    //解析v-model 这个指令
    model (node, expr, vm) { //node是节点  expr是表达式  vm是当前实例 school.name  vm.$data
        //给输入框赋予value属性  node.value=xxx
        let fn = this.updater['modelUpdater']
        new Watcher(vm, expr, (newVal) => { //给输入框加一个观察者 如果稍后数据更新，会触发此方法 会拿新值 给输入框 赋予值
            fn(node, newVal)
        })
        node.addEventListener('input', (e) => {
            let value = e.target.value //获取用户输入的内容
            this.setValue(vm, expr, value)
        })
        let value = this.getVal(vm, expr) //珠峰
        // console.log('value====',value)
        fn(node, value)

    },
    html (node, expr, vm) { // v-html='message'
        //  node.innerHTML=xxx

        let fn = this.updater['htmlUpdater']
        new Watcher(vm, expr, (newVal) => {
            console.log()
            fn(node, newVal)
        })

        let value = this.getVal(vm, expr) //珠峰
        // console.log('value====',value)
        fn(node, value)
    },
    getContentValue (vm, expr) {
        //遍历表达式 将内容 重新替换成一个完整的内容 返还回去
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            return this.getVal(vm, args[1])
        })
    },
    on (node, expr, vm, eventName) { //v-on:click='name'   expr -> change
        node.addEventListener(eventName, (e) => {
            vm[expr].call(vm, e); //this.change

        })

    },
    text (node, expr, vm) { //expr  -> 珠峰 {{b}}  {{c}}

        let fn = this.updater['textUpdater']

        let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            // console.log('args[1]=========',args[1])
            // console.log('----this.getVal(vm,args[1])----------',this.getVal(vm,args[1]))
            //给表达式每个人{{}}  都加上观察者
            new Watcher(vm, args[1], () => {
                fn(node, this.getContentValue(vm, expr)) //返回了一个全的字符串

            })
            return this.getVal(vm, args[1])
        })
        fn(node, content)

    },
    updater: {
        htmlUpdater (node, value) { // xss攻击
            node.innerHTML = value

        },
        // 把数据插入到节点中
        modelUpdater (node, value) {
            node.value = value

        },
        textUpdater (node, value) {
            node.textContent = value
        }
    }

}


class Vue {
    constructor (options) {
        //this.$el $data $options

        this.$el = options.el;
        this.$data = options.data;
        let computed = options.computed
        let methods = options.methods
        //这个根元素 存在 编译模板
        if (this.$el) {
            //把数据  全部转化成用Object.defineProperty来定义
            new Observer(this.$data)


            // console.log(this.$data)

            // {{getNewName}} reduce vm.$data.getNewName
            for (let key in computed) { //有依赖关系 数据
                Object.defineProperty(this.$data, key, {
                    get: () => {
                        return computed[key].call(this)
                    }
                })
            }
            for (let key in methods) {
                Object.defineProperty(this, key, {
                    get () {
                        return methods[key]
                    }
                })
            }
            //把数据获取操作 vm 上的取值操作  都代理到 vm.$data

            this.proxyVm(this.$data)

            new Compiler(this.$el, this)

        }
    }

    //backone set()  get()
    proxyVm (data) {
        for (let key in data) { //{school:{name,age}}
            Object.defineProperty(this, key, { //实现了 取值 可以通过vm取到对应的内容
                get () {
                    return data[key] //进行了转化操作
                },
                set (newVal) { //设置代理方法
                    data[key] = newVal

                }
            })
        }
    }
}
