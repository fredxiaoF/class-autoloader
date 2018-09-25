const Path = require('path');
const FS = require('fs');

module.exports = class EagerLoader {
  constructor(config={}) {
    this.config = config;
  }
  
  load() {
    for (let root of this.config.autoload_paths){
      this._load_directroy(root, '');
    }
    
  }
  
  
  _load_directroy(root, super_scope = '') {
    let path = Path.resolve(root);
    let files = fs.readdirSync(path);
    
    for (let file of files){
      let full_path = Path.join(path, file);
      let fstat = null;

      [full_path, fstat] = this._parse_file(full_path);
      
      let class_name = this._camel_case(file);
      // console.log(class_name);
      let klass = eval(super_scope + class_name);
      
      if (fstat.isDirectory()) this._load_directroy(full_path, `${super_scope}${class_name}.`);
    }
    
  }
  
  
  _parse_file(full_path) {
    try {
      let stat = FS.lstatSync(full_path);
      return [full_path, stat];
    } catch (e) {
      return [];
    }
  }
  
  
  _camel_case(file) {
    let filename = file.replace(/\.js/g, '');
    let class_name = filename.replace(/(^|_)([a-z])/g, function($0, $1, $2) { return $2.toUpperCase() } );
    return class_name;
  }
  
  
  
  
  
}