Design notes
------------

### Why another?

Creating and manipulating objects in JavaScript is very easy: if you need [single-inheritance], then set the [prototype chain]; if you need to share methods between objects, then [modify the prototype] directly.

But those operations are low level, which means code duplication and more chances to make mistakes. That's why most frameworks provides their own abstractions.

For example [Backbone], [Closure], [YUI], [Dojo], [Prototype], and [ExtJS], have functions to simplify [single-inheritance] and mixins; but with them you also get a full UI or application framework.

I wanted something small, that only provides abstractions to define objects. So I've evaluated different options:

* [traitsjs]
* [compose]
* [chains]
* [dejavu] - actually it was released when I was already working on barman

All of these libraries had similarities and differences, with more or less features.

But they were not exactly what I wanted. It doesn't means that barman is _better_, it's matter of personal needs and preference, so I encourage you to take a look into those libraries too.

The _guiding design principles_ of barman are:

* **Keep it simple to understand**. For example the concept of _class_ doesn't apply directly to JavaScript, but it's common for programmers that comes from class based programming languages. So `Class.create` was preferred over introducing a new term.

* **Play nice with _standard_ JavaScript**. It means to avoid special method signatures or attributes.

* **Don't re-invent JavaScript**. JavaScript has no type checking, and limited encapsulation. If you want those features you'll probably need some external tool, and special attributes/methods to support them.
I didn't wanted to add those features to barman. If you really need them, you can consider other options like: [dejavu] which provides some limited constraint checking; or a different programing language for the web like [Dart] or [Typescript].

### Mixins and traits

The work on barman, was based in two papers:

* The [mixins paper] from Gilad Bracha and William Cook.
* The [traits paper] from Nathanael Scharli, Stephane Ducasse, Oscar Nierstrasz, and Andrew P. Black

Reading the last one is recommend if you want to understand what means _trait_ in the context of barman. But if you are lazy about reading, here is a small summary about _mixins_ and _traits_:

* **Mixins**: Is a way of sharing implementation by adding a set of methods to a _class_. In JavaScript, the concept is simple because there isn't _classes_ and there isn't _type annotations_, two concepts that overlap in most class based languages. So what means a mixin in JavaScript terms? Just sharing a bunch of methods by adding them to an object.
* **Traits**: Has the same goal as mixins, but adds some rules on how the methods are added to avoid mistakes. Note that barman uses the term _trait_ as in the mentioned traits paper. Some programming languages uses the same term with other meanings: [Scala] uses trait to mean mixin, [Self] uses trait to mean an object prototype.

### Functional mixins

Doing _mixins_ in JavaScript is easy. Just create functions that adds properties to an object:

```js
addMoreMethods(addSomeMethods(MyConstructor.prototype))
```

But this approach has some problems:

* **What happens if `addMoreMethods` and `addSomeMethods` tries to write the same property?**. It depends on how the functions are implemented.

* **What if you want to override a method?** Some people use [function wrappers] to do that. But they are very confusing, for example: what means _before_ or _after_? Is before _my_ function or before the mixin function?
You don't know, again it depends on the implementation details of each function.

The main point here is that you have a lot of freedom on how to extend objects, but that freedom adds more uncertainty that makes maintainability and program understanding hard.

Another way of doing mixins in JavaScript is by using objects. That's the approach used  by a lot of frameworks:

```js
extend(dest, mixin1, mixin2)
```

The application order is still an issue, and you can't use [function wrappers] in this way; but is easy to understand and straight forward to implement.

At the beginning I wanted to support functional mixins, because is a common JavaScript technique, and that support can help in the migration of existing code to use barman.

From that requirement came the idea of having _class factories_, so the strategy used by `Class.create` can be switched, from mixins:

```js
Class.create(
   withMixins(functionOrObject, otherFunctionOrObject),
   { /* methods */ }
);
```

to traits (note `withTraits` was later renamed to `include`):

```js
Class.create(
   withTraits(traitObject1, traitObject2),
   { /* methods */ }
);
```

But this approach forces the user to make some decisions before hand: _Should I use traits or mixins? What's the difference?_.

In the end the problems surpasses the benefits, so I decided to remove support for functional mixins: if you use [function wrappers], your code can be made easy to understand by using aliases or `_super`.

But the _class factory_ idea was keep because it makes easy to extend the framework.

### Method decorations

The object that you give to the _class factory_ is an specification of the methods that you want to create. So instead of using functions you can use an object to describe some special case. That approach is used by [compose] with the name of _method decorations_, and is more or less like a macro to define methods.

For example, one possible use case for _method decorations_ is to create a method that is injected with a reference to super (like in [Prototype]):

```js
SuperClass.extend({
	someMethod: injectSuper(function ($super) {
		// here $super as a bound reference to
    // someMethod in SuperClass
  });
});
```

But the idea was discarded, because I couldn't find any good use case to apply it:

* Injecting super in that way, like [Prototype] does, is hard to read, and adds complexity to the handling of function arguments.

* [compose] uses this kind of method specification to have aliases, but after playing with aliases I didn't found the advantage of it:
```js
// I don't see any advantage of having, this:
{method: from(SuperClass, 'other')}
// over this:
{method: SupeClass.other}
```

#### The _aha! moment_: the merge function

A mayor simplification to the framework came while implementing trait composition.

I started with a _Trait_ object, like in [traitsjs], because having a proper reification of the concept is good.

But during the implementation of _trait composition_, I found that the advantage of a proper reification were few compared to the added complexity.

The _trait composition_ consists of two things:

1. Handling conflicts, with aliases or exclusions.
2. Doing the _method flattening_.

The first can be resolved by comparing the value of conflicting properties.
The second is very easy to do in JavaScript: like with `extend` just join multiple properties into one object.

This two cases can be implemented with a function similar to `extend`, that I called merge (because is similar to a VCS merge):
```js
result = merge(o1, o2)
```
If _o1_ and _o2_ defines the same property but with a different value, the property is replaced with a `conflict` function that throws an error when executed (remember, is not my goal to add a pseudo-type checking to JavaScript).

But how a conflict is resolved? You only need to overwrite the conflicting methods. And the usual `extend` fits very well for that task:

```js
result = extend(merge(o1, o2), {prop: impl});
```

In that way choosing which implementation to use is easy:
```js
result = extend(merge(o1, o2), {prop: o1.prop});
```

With this implementation you don't have a proper _Trait class_, but it works and covers most of the characteristics of a trait mentioned in the [traits paper]:

* Composition of traits is symmetric: `merge(o1, o2) == merge(o2, o1)`
* The same method added from different traits doesn't generate a conflict: `merge(o1, o2, o1) == merge(o1, o2)`
* Traits that uses other traits is possible, because methods are _flattened_: `merge(o1, merge(o1, o2)) == merge(o1, o2)`
* You can do aliasing and choose how to resolve conflicts.


### Limitations of the traits implementation

The mentioned [traits paper] also specifies the following requirement for traits:

> "Traits do not specify any state variables, and the methods provided by traits never access state variables directly."

Most of the reasons for this restriction comes from the [Smalltalk] implementation in which the paper is based:

* [Smalltalk] is not statically typed and all the instance variables are _nil_ until you initialize them in a method. It means that you cannot tell if two traits are going to use a _compatible_ initial variable value, and you cannot ensure that initialization only happens once.

* In [Smalltalk] instance variables determines the _class shape_: how the class is represented in memory.

  And since compiled methods are not designed to be shared between classes, they are tightly coupled with the _class shape_: bytecode references instance variables by index.

  But the purpose of traits is to share methods between classes, so if you allow instance variables you have to re-compile the class hierarchy each time that you touch a trait that affects it.
  The big issue of re-compilation is that if instance variables clashes there will be a compilation error, and you have to handle those errors in some way.

As you can see adding support for instance variables in the [Smalltalk] traits implementation is a big headache, so is better to avoid them.


##### But how these problems applies to JavaScript?

* In JavaScript there is no difference between instance variables and methods (besides the value type): methods and instance variables are just slots in a _hash map_, there is no such thing as _class shape_.

* Nothing prevents you from doing `this.myVar = value` inside your function implementation.

In this context what barman gives you is a way of merging properties for your prototype definition. It doesn't try to resolve this _fundamental_ problems.
It finds conflicts using strict equality `===`, and applies that strategy for all the object _slots_.

If you want to be picky about traits definition, barman doesn't implement _true traits_, neither does [traitsjs]. But I keep using the name _traits_ to make a distinction from the _last-one-wins_ strategy of mixins.

[single-inheritance]: http://en.wikipedia.org/wiki/Inheritance_(object-oriented_programming)
[traits]: http://en.wikipedia.org/wiki/Trait_(computer_programming)
[mixins]: http://en.wikipedia.org/wiki/Mixins
[prototype chain]: https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Inheritance_and_the_prototype_chain
[modify the prototype]: https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Details_of_the_Object_Model#Adding_properties
[source map]: http://net.tutsplus.com/tutorials/tools-and-tips/source-maps-101/
[mixins paper]: http://www.bracha.org/oopsla90.pdf
[traits paper]: http://scg.unibe.ch/archive/papers/Scha03aTraits.pdf
[function wrappers]: https://speakerdeck.com/anguscroll/how-we-learned-to-stop-worrying-and-love-javascript

[Scala]: http://www.scala-lang.org/
[Self]: http://en.wikipedia.org/wiki/Self_(programming_language)#Traits
[Smalltalk]: http://en.wikipedia.org/wiki/Smalltalk
[Python]: http://www.python.org/

[AMD]: http://requirejs.org/docs/whyamd.html#amd
[Backbone]: http://backbonejs.org/
[Closure]: https://developers.google.com/closure/
[YUI]: http://yuilibrary.com/
[Dojo]: http://dojotoolkit.org/
[Prototype]: http://prototypejs.org/
[ExtJS]: http://www.sencha.com/products/extjs
[traitsjs]: http://soft.vub.ac.be/~tvcutsem/traitsjs/
[compose]: https://github.com/kriszyp/compose
[chains]: https://github.com/stomlinson/Chains
[dejavu]: https://github.com/IndigoUnited/dejavu
[Dart]: http://www.dartlang.org/
[Typescript]: http://www.typescriptlang.org/
[Nodejs]: http://nodejs.org/
[Grunt]: http://gruntjs.com/
[PhantomJS]: http://phantomjs.org/