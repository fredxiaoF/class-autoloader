const Path = require('path');
const FS = require('fs');
const EagerLoader = require('./eager_loader');

module.exports = class ClassAutoloader {
  
  constructor(config={}){
    this.config = config;
    
    this.eager_loader = new EagerLoader(config);
    
    if (!Reflect.has(config, 'autoload_paths')) throw "config.autoload_paths required!"
    
    if (!Reflect.has(config, 'cache_classes')) this.config.cache_classes = false;
      
    this._set_global_class_namescope();
    
    this._proxy_global_variables();
    
    if (config.cache_classes && config.eager_load) {
      this.eager_loader.load();
    }
  }
    
  
  // A class namescope included all classes required with autoload
  _set_global_class_namescope() {
    if (!global.classes) {
      this.global_classes = global.classes = {};
    }
  }
  
  
  _proxy_global_variables() {
    global.__proto__ = this._proxy_autoload(global.__proto__, true);
  }
  
  
  _proxy_autoload(obj, is_global_level = false) {
    return new Proxy(obj, {
      get: (tar, attr) => {
        if (tar[attr] && tar[attr].mtimeMs) {
          return this.load(attr, is_global_level ? null : tar);
        } else {
          return tar[attr] || this.load(attr, is_global_level ? null : tar);
        }
      }
    });
  }
  
  
  load(class_name, super_scope = null){    
    let klass = this._load_cache(class_name, super_scope);
    
    // Avoid console.log(xxx) will call xxx[Symbol(util.inspect)]
    if (!klass && typeof(class_name) !== 'string') return undefined;
    
    if (klass) {
      // return cache if cache_classes is enabled
      if (this.config.cache_classes == true) return klass;
      
      // reload if file modified
      if (this._is_latest(klass, class_name, super_scope)) return klass;
    }    
    
    let filename = this._underscore_case(class_name);
    let [full_file_path, file_stat] = this._detect_file(filename, super_scope);
    
    if (!full_file_path) return undefined;
    
    return file_stat.isDirectory() ? 
      this._load_directory(class_name, full_file_path, file_stat, super_scope) : 
      this._load_file(class_name, full_file_path, file_stat, super_scope);
  }
  
  
  _load_cache(class_name, super_scope = null) {
    return super_scope ? super_scope[class_name] : global.classes[class_name]
  }
  
  
  _load_directory(class_name, full_path, file_stat, super_scope=null){
    // 根据class_name创建一个命名空间类
    let klass = new Function();
    Reflect.defineProperty(klass, 'name', {value: class_name});
    Reflect.defineProperty(klass, 'isDirectory', {emumerable: false, writable: true, value: true});
    klass.path = full_path;
    
    // 设置命名空间类的自动加载
    klass = this._proxy_autoload(klass);
    
    this._save_cache(klass, class_name, super_scope);
    
    return klass;
  }
  
  
  _load_file(class_name, full_path, file_stat, super_scope=null){
    let klass = require(full_path);
    Reflect.defineProperty(klass, 'mtimeMs', {emumerable: false, writable: true, value: file_stat.mtimeMs});
    
    this._save_cache(klass, class_name, super_scope);
    
    return klass;
  }
  
  
  _save_cache(klass, class_name, super_scope) {
    if (super_scope) {
      super_scope[class_name] = klass;
    } else {
      global.classes[class_name] = klass;
    }
  }
  
  
  _remove_cache(full_file_path, class_name, super_scope) {
    if (super_scope) {
      delete super_scope[class_name];
    } else {
      delete global.classes[class_name];
    }
    
    try {
      delete require.cache[require.resolve(full_file_path)];
    } catch (e) { 
    }
  }
  
  
  _is_latest(klass, class_name, super_scope) {
    let filename = this._underscore_case(class_name);
    let [full_file_path, file_stat] = this._detect_file(filename, super_scope);
    
    if (!file_stat) {
      this._remove_cache(full_file_path, class_name, super_scope);
      return false;
    }
    
    if (!klass.isDirectory === file_stat.isDirectory()) {
      this._remove_cache(full_file_path, class_name, super_scope);
      return false;
    }
    
    if (!klass.isDirectory && klass.mtimeMs < file_stat.mtimeMs) {
      this._remove_cache(full_file_path, class_name, super_scope);
      return false;
    }
    
    return true;
  }
  
  
  _detect_file(filename, super_scope = null) {
    if (super_scope) {
      let full_path = Path.join(super_scope.path, filename);    
      return this._parse_file(full_path);
    }
    
    for (let root of this.config.autoload_paths){
      let full_path = Path.join(Path.resolve(root), filename);
      let result = this._parse_file(full_path);
      if (result[0]) return result;
    }
    return []
  }
  
  
  _parse_file(full_path) {
    let stat = null;
    let dump_stat = null;
    try {
      stat = FS.lstatSync(full_path + '.js');
      try {
        dump_stat = FS.lstatSync(full_path);
      } catch (e) {}
      
      if (!dump_stat) return [full_path, stat];
    } catch (e) {}
    
    if (dump_stat) throw new DumplicateNameError(`Dumplicate namespace at: ${full_path}`);
    
    try {
      stat = FS.lstatSync(full_path);
      return [full_path, stat];
    } catch (e) {
      return [];
    }
  }
  
  
  _underscore_case(class_name) {
    let file_name = class_name.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();});
    file_name = file_name.replace(/^_/, '');
    return file_name;
  }
  
  
  
}

class DumplicateNameError extends Error {
}