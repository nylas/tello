(function() {
  var Digester, atomdoc, path, _,
    __slice = [].slice;

  path = require('path');

  _ = require('underscore');

  atomdoc = require('atomdoc');

  Digester = (function() {
    function Digester() {
      this.current = {};
    }

    Digester.prototype.digest = function(metadata) {
      var classResult, classes, column, columnsObj, fileData, filename, files, object, packageObject, row, _i, _len, _ref;
      classes = {};
      for (_i = 0, _len = metadata.length; _i < _len; _i++) {
        packageObject = metadata[_i];
        this.current["package"] = packageObject;
        files = packageObject.files;
        for (filename in files) {
          fileData = files[filename];
          this.current.filename = filename;
          this.current.objects = fileData.objects;
          this.current.sections = this.extractSections(fileData.objects);
          _ref = fileData.objects;
          for (row in _ref) {
            columnsObj = _ref[row];
            for (column in columnsObj) {
              object = columnsObj[column];
              switch (object.type) {
                case 'class':
                  classResult = this.digestClass(object);
                  if (classResult != null) {
                    classes[classResult.name] = classResult;
                  }
              }
            }
          }
        }
      }
      return {
        classes: classes
      };
    };

    Digester.prototype.digestClass = function(classEntity) {
      var classDoc, classMethods, classProperties, filteredSections, instanceMethods, instanceProperties, method, parsedAttributes, section, sections, _i, _j, _len, _len1, _ref;
      classDoc = this.docFromDocString(classEntity.doc);
      if (!classDoc) {
        return;
      }
      console.log("Digesting " + classEntity.name + "...");
      sections = this.filterSectionsForRowRange(classEntity.range[0][0], classEntity.range[1][0]);
      classMethods = this.extractEntities(sections, classEntity.classProperties, 'function');
      instanceMethods = this.extractEntities(sections, classEntity.prototypeProperties, 'function');
      classProperties = this.extractEntities(sections, classEntity.classProperties, 'primitive');
      instanceProperties = this.extractEntities(sections, classEntity.prototypeProperties, 'primitive');
      filteredSections = [];
      for (_i = 0, _len = sections.length; _i < _len; _i++) {
        section = sections[_i];
        _ref = classMethods.concat(instanceMethods).concat(classProperties).concat(instanceProperties);
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          method = _ref[_j];
          if (section.name === method.sectionName) {
            filteredSections.push(_.pick(section, 'name', 'description'));
            break;
          }
        }
      }
      parsedAttributes = ['visibility', 'summary', 'description', 'events', 'examples'];
      return _.extend({
        name: classEntity.name,
        superClass: classEntity.superClass,
        filename: this.current.filename,
        srcUrl: this.linkForRow(classEntity.range[0][0]),
        sections: filteredSections,
        classMethods: classMethods,
        instanceMethods: instanceMethods,
        classProperties: classProperties,
        instanceProperties: instanceProperties
      }, _.pick.apply(_, [classDoc].concat(__slice.call(parsedAttributes))));
    };

    Digester.prototype.digestEntity = function(sections, entity, entityPosition) {
      var doc, parsedAttributes;
      doc = this.docFromDocString(entity.doc);
      if (doc == null) {
        return;
      }
      parsedAttributes = ['visibility', 'summary', 'description', 'arguments', 'titledArguments', 'events', 'examples', 'returnValues'];
      return _.extend({
        name: entity.name,
        sectionName: this.sectionNameForRow(sections, entityPosition[0]),
        srcUrl: this.linkForRow(entityPosition[0])
      }, _.pick.apply(_, [doc].concat(__slice.call(parsedAttributes))));
    };

    /*
    Section: Utils
    */


    Digester.prototype.extractEntities = function(sections, entityPositions, entityType) {
      var entities, entity, entityObject, entityPosition, _i, _len;
      entities = [];
      for (_i = 0, _len = entityPositions.length; _i < _len; _i++) {
        entityPosition = entityPositions[_i];
        entityObject = this.objectFromPosition(entityPosition);
        if (entityObject) {
          if (entityObject.type === entityType) {
            entity = this.digestEntity(sections, entityObject, entityPosition);
            if (entity != null) {
              entities.push(entity);
            }
          }
        } else {
          console.log("Donna could not find an entity at position " + entityPosition + ". \nCheck to make sure your class properties in " + this.current.filename + " \nuse @prop: instead of @prop=");
        }
      }
      return entities;
    };

    Digester.prototype.extractSections = function(objects) {
      var column, columnsObj, object, row, section, sections;
      sections = [];
      for (row in objects) {
        columnsObj = objects[row];
        for (column in columnsObj) {
          object = columnsObj[column];
          if (object.type === 'comment') {
            section = this.sectionFromCommentEntity(object);
            if (section != null) {
              sections.push(section);
            }
          }
        }
      }
      return sections;
    };

    Digester.prototype.sectionFromCommentEntity = function(commentEntity) {
      var doc, _ref, _ref1;
      doc = atomdoc.parse(commentEntity.doc);
      if ((doc != null ? doc.visibility : void 0) === 'Section') {
        return {
          name: doc.summary,
          description: (_ref = (_ref1 = doc.description) != null ? _ref1.replace(doc.summary, '').trim() : void 0) != null ? _ref : '',
          startRow: commentEntity.range[0][0],
          endRow: commentEntity.range[1][0]
        };
      } else {
        return null;
      }
    };

    Digester.prototype.filterSectionsForRowRange = function(startRow, endRow) {
      var section, sections, _i, _len, _ref;
      sections = [];
      _ref = this.current.sections;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        section = _ref[_i];
        if (section.startRow >= startRow && section.startRow <= endRow) {
          sections.push(section);
        }
      }
      sections.sort(function(sec1, sec2) {
        return sec1.startRow - sec2.startRow;
      });
      return sections;
    };

    Digester.prototype.sectionNameForRow = function(sections, row) {
      var i, section, _i, _ref;
      if (!sections.length) {
        return null;
      }
      for (i = _i = _ref = sections.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
        section = sections[i];
        if (row > section.startRow) {
          return section.name;
        }
      }
      return null;
    };

    Digester.prototype.docFromDocString = function(docString) {
      var classDoc;
      if (docString != null) {
        classDoc = atomdoc.parse(docString);
      }
      if (classDoc && classDoc.isPublic()) {
        return classDoc;
      } else {
        return null;
      }
    };

    Digester.prototype.objectFromPosition = function(position) {
      var _ref;
      return (_ref = this.current.objects[position[0]]) != null ? _ref[position[1]] : void 0;
    };

    Digester.prototype.linkForRow = function(row) {
      var filePath, repo;
      if (this.current["package"].repository == null) {
        return null;
      }
      repo = this.current["package"].repository.replace(/\.git$/i, '');
      filePath = path.normalize("/blob/v" + this.current["package"].version + "/" + this.current.filename);
      return "" + repo + filePath + "#L" + (row + 1);
    };

    return Digester;

  })();

  module.exports = {
    digest: function(metadata) {
      return new Digester().digest(metadata);
    }
  };

}).call(this);
