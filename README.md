class-autoloader
================

> class-autoloader is a class autoloader, just like Rails class autoloader

## Install
>Install with [npm](https://github.com/npm/npm)

```
$ npm install class-autoloader
```


## Hello world
```sh
npm install class-autoloader
touch index.js
mkdir app
mkdir app/controllers
touch app/controllers/articles_controller.js
```

articles_controller.js
```js
module.exports = class ArticlesController {
  static hello() {
    return "Hi!";
  }
}
```

index.js:
```js
const ClassAutoloader = require('class-autoloader');

const Config = {
  autoload_paths: ['app/controllers'],
  cache_classes: false
}

const Loader = new ClassAutoloader(Config);
```

Run it
```sh
$ node -r index.js
> ArticlesController.hello();
Hi!
```

Now modify the file articles_controller.js 
```js
module.exports = class ArticlesController {
  static hello() {
    return 'Hello Fred!';
  }
}
```
And call again
```sh
$ node -r index.js
> ArticlesController.hello();
Hi!
> ArticlesController.hello();
Hello Fred!
```

## Cache classes
You can set cache_classes with true to cache classes. It will cause no class will be autoloaded

## Name scope
You can also specify a name scope e.g.

```sh
$ mkdir app/controllers/my_scope
$ touch app/controllers/my_scope/one_class.js
```
```js
MyScope.OneClass // will cause autoload one_class.js
```

## Eager load
Set cache_classes and cache_classes with true, classes will be autoloaded before call it 


## License
The MIT License, 2018 [Fred Shaw](https://github.com/fredxiaoF) ([@FredShawF](https://twitter.com/FredShawF))
