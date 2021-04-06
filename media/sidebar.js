var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* webviews\components\Sidebar.svelte generated by Svelte v3.31.2 */
    const file = "webviews\\components\\Sidebar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[24] = i;
    	return child_ctx;
    }

    // (99:2) {:else}
    function create_else_block(ctx) {
    	let p;
    	let p_class_value;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "You have no stashed tabs..";
    			attr_dev(p, "class", p_class_value = "" + (null_to_empty("status") + " svelte-1jt8qet"));
    			add_location(p, file, 99, 4, 3083);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(99:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (85:2) {#each state as item, index (index)}
    function create_each_block(key_1, ctx) {
    	let li;
    	let div2;
    	let div0;
    	let t0_value = /*item*/ ctx[22].name + "";
    	let t0;
    	let t1;
    	let div1;
    	let t3;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[12](/*item*/ ctx[22], ...args);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[13](/*item*/ ctx[22]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "X";
    			t3 = space();
    			add_location(div0, file, 87, 8, 2852);
    			attr_dev(div1, "class", "deleteContainer svelte-1jt8qet");
    			add_location(div1, file, 90, 8, 2906);
    			attr_dev(div2, "class", "stashedItem_container svelte-1jt8qet");
    			add_location(div2, file, 86, 6, 2807);
    			attr_dev(li, "class", "stashedItem svelte-1jt8qet");
    			add_location(li, file, 85, 4, 2740);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(li, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", click_handler, false, false, false),
    					listen_dev(li, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*state*/ 2 && t0_value !== (t0_value = /*item*/ ctx[22].name + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(85:2) {#each state as item, index (index)}",
    		ctx
    	});

    	return block;
    }

    // (115:12) Yes
    function fallback_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Yes");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_1.name,
    		type: "fallback",
    		source: "(115:12) Yes",
    		ctx
    	});

    	return block;
    }

    // (125:10) No
    function fallback_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(125:10) No",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h30;
    	let t1;
    	let form;
    	let input0;
    	let t2;
    	let h31;
    	let t4;
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t5;
    	let hr;
    	let t6;
    	let h32;
    	let t8;
    	let div2;
    	let div0;
    	let input1;
    	let input1_value_value;
    	let t9;
    	let div1;
    	let input2;
    	let input2_value_value;
    	let t10;
    	let t11;
    	let button;

    	let t12_value = (/*confirmDelete*/ ctx[2]
    	? "Are you sure?"
    	: "Delete all stash") + "";

    	let t12;
    	let button_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*state*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*index*/ ctx[24];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	const default_slot_or_fallback = default_slot || fallback_block_1(ctx);
    	const default_slot_template_1 = /*#slots*/ ctx[9].default;
    	const default_slot_1 = create_slot(default_slot_template_1, ctx, /*$$scope*/ ctx[8], null);
    	const default_slot_or_fallback_1 = default_slot_1 || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			h30 = element("h3");
    			h30.textContent = "Enter stash name:";
    			t1 = space();
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			h31 = element("h3");
    			h31.textContent = "Stashed tabs:";
    			t4 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			t5 = space();
    			hr = element("hr");
    			t6 = space();
    			h32 = element("h3");
    			h32.textContent = "Always pop stash?";
    			t8 = space();
    			div2 = element("div");
    			div0 = element("div");
    			input1 = element("input");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t9 = space();
    			div1 = element("div");
    			input2 = element("input");
    			t10 = space();
    			if (default_slot_or_fallback_1) default_slot_or_fallback_1.c();
    			t11 = space();
    			button = element("button");
    			t12 = text(t12_value);
    			attr_dev(h30, "class", "title svelte-1jt8qet");
    			add_location(h30, file, 77, 0, 2484);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 79, 2, 2594);
    			add_location(form, file, 78, 0, 2526);
    			attr_dev(h31, "class", "title svelte-1jt8qet");
    			add_location(h31, file, 82, 0, 2652);
    			attr_dev(ul, "class", "svelte-1jt8qet");
    			add_location(ul, file, 83, 0, 2690);
    			add_location(hr, file, 103, 0, 3155);
    			attr_dev(h32, "class", "title svelte-1jt8qet");
    			add_location(h32, file, 105, 0, 3165);
    			attr_dev(input1, "type", "radio");
    			input1.__value = input1_value_value = 1;
    			input1.value = input1.__value;
    			attr_dev(input1, "class", "radioContainer_button svelte-1jt8qet");
    			/*$$binding_groups*/ ctx[15][0].push(input1);
    			add_location(input1, file, 108, 4, 3250);
    			add_location(div0, file, 107, 2, 3239);
    			attr_dev(input2, "type", "radio");
    			input2.__value = input2_value_value = 0;
    			input2.value = input2.__value;
    			attr_dev(input2, "class", "radioContainer_button svelte-1jt8qet");
    			/*$$binding_groups*/ ctx[15][0].push(input2);
    			add_location(input2, file, 117, 4, 3447);
    			add_location(div1, file, 116, 2, 3436);
    			attr_dev(div2, "class", "radioContainer svelte-1jt8qet");
    			add_location(div2, file, 106, 0, 3207);
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*confirmDelete*/ ctx[2] ? "confirmDeleteColor" : "") + " svelte-1jt8qet"));
    			add_location(button, file, 128, 0, 3646);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input0);
    			set_input_value(input0, /*inputValue*/ ctx[3]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(ul, null);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, h32, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, input1);
    			input1.checked = input1.__value === /*popState*/ ctx[0];

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(div0, null);
    			}

    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div1, input2);
    			input2.checked = input2.__value === /*popState*/ ctx[0];
    			append_dev(div1, t10);

    			if (default_slot_or_fallback_1) {
    				default_slot_or_fallback_1.m(div1, null);
    			}

    			insert_dev(target, t11, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, t12);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[11]), false, true, false),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[14]),
    					listen_dev(input1, "click", /*click_handler_2*/ ctx[16], false, false, false),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[17]),
    					listen_dev(input2, "click", /*click_handler_3*/ ctx[18], false, false, false),
    					listen_dev(button, "click", /*toggleConfirmOrDelete*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inputValue*/ 8 && input0.value !== /*inputValue*/ ctx[3]) {
    				set_input_value(input0, /*inputValue*/ ctx[3]);
    			}

    			if (dirty & /*handleClick, state, removeStashedItem*/ 82) {
    				each_value = /*state*/ ctx[1];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block(ctx);
    					each_1_else.c();
    					each_1_else.m(ul, null);
    				}
    			}

    			if (dirty & /*popState*/ 1) {
    				input1.checked = input1.__value === /*popState*/ ctx[0];
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (dirty & /*popState*/ 1) {
    				input2.checked = input2.__value === /*popState*/ ctx[0];
    			}

    			if (default_slot_1) {
    				if (default_slot_1.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot_1, default_slot_template_1, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if ((!current || dirty & /*confirmDelete*/ 4) && t12_value !== (t12_value = (/*confirmDelete*/ ctx[2]
    			? "Are you sure?"
    			: "Delete all stash") + "")) set_data_dev(t12, t12_value);

    			if (!current || dirty & /*confirmDelete*/ 4 && button_class_value !== (button_class_value = "" + (null_to_empty(/*confirmDelete*/ ctx[2] ? "confirmDeleteColor" : "") + " svelte-1jt8qet"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			transition_in(default_slot_or_fallback_1, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			transition_out(default_slot_or_fallback_1, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (each_1_else) each_1_else.d();
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(h32);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div2);
    			/*$$binding_groups*/ ctx[15][0].splice(/*$$binding_groups*/ ctx[15][0].indexOf(input1), 1);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			/*$$binding_groups*/ ctx[15][0].splice(/*$$binding_groups*/ ctx[15][0].indexOf(input2), 1);
    			if (default_slot_or_fallback_1) default_slot_or_fallback_1.d(detaching);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const storageKey = "stashedItems";
    const popStashKey = "popState";

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", slots, ['default']);

    	let state = localStorage.getItem(storageKey)
    	? JSON.parse(localStorage.getItem(storageKey))
    	: [];

    	let popState = localStorage.getItem(popStashKey)
    	? Number(JSON.parse(localStorage.getItem(popStashKey)))
    	: 0;

    	let confirmDelete = false;
    	let inputValue = "";

    	onMount(() => {
    		window.addEventListener("message", event => {
    			const stash = event.data; // The json data that the extension sent
    			const { name, tabPaths } = stash.value;

    			switch (stash.type) {
    				case "add-stash":
    					$$invalidate(1, state = [{ name, tabPaths, id: uniqueID() }, ...state]);
    					storeStashedItem(state);
    					break;
    			}
    		});
    	});

    	const removeStashedItem = (item, e) => {
    		if (e) e.stopPropagation();
    		$$invalidate(1, state = state.filter(i => i.id !== item.id));
    		if (!state) return localStorage.removeItem(storageKey);
    		localStorage.setItem(storageKey, JSON.stringify(state));
    	};

    	// TODO: Replace with real uuid when launch.
    	const uniqueID = () => {
    		return ("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx").replace(/[xy]/g, function (c) {
    			var r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
    			return v.toString(16);
    		});
    	};

    	const toggleConfirmOrDelete = () => {
    		if (!confirmDelete) {
    			$$invalidate(2, confirmDelete = true);
    		} else {
    			$$invalidate(1, state = []);
    			if (localStorage.getItem(storageKey)) localStorage.removeItem(storageKey);
    			if (localStorage.getItem(popStashKey)) localStorage.removeItem(popStashKey);
    			$$invalidate(2, confirmDelete = false);
    		}
    	};

    	const storeStashedItem = state => {
    		localStorage.setItem(storageKey, JSON.stringify(state));
    	};

    	const storePopState = key => {
    		localStorage.setItem(popStashKey, JSON.stringify(key));
    	};

    	const handleClick = item => {
    		if (!item || !item.tabPaths) return;
    		if (popState === 1) removeStashedItem(item);
    		tsvscode.postMessage({ type: "onOpenTabs", value: item });
    	};

    	const handleConfirmedInput = e => {
    		if (!inputValue) return;
    		e.preventDefault();
    		tsvscode.postMessage({ type: "onAddStash", value: inputValue });
    		$$invalidate(3, inputValue = "");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input0_input_handler() {
    		inputValue = this.value;
    		$$invalidate(3, inputValue);
    	}

    	const submit_handler = e => handleConfirmedInput(e);
    	const click_handler = (item, e) => removeStashedItem(item, e);
    	const click_handler_1 = item => handleClick(item);

    	function input1_change_handler() {
    		popState = this.__value;
    		$$invalidate(0, popState);
    	}

    	const click_handler_2 = () => $$invalidate(0, popState = 1);

    	function input2_change_handler() {
    		popState = this.__value;
    		$$invalidate(0, popState);
    	}

    	const click_handler_3 = () => $$invalidate(0, popState = 0);

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		storageKey,
    		popStashKey,
    		state,
    		popState,
    		confirmDelete,
    		inputValue,
    		removeStashedItem,
    		uniqueID,
    		toggleConfirmOrDelete,
    		storeStashedItem,
    		storePopState,
    		handleClick,
    		handleConfirmedInput
    	});

    	$$self.$inject_state = $$props => {
    		if ("state" in $$props) $$invalidate(1, state = $$props.state);
    		if ("popState" in $$props) $$invalidate(0, popState = $$props.popState);
    		if ("confirmDelete" in $$props) $$invalidate(2, confirmDelete = $$props.confirmDelete);
    		if ("inputValue" in $$props) $$invalidate(3, inputValue = $$props.inputValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*popState*/ 1) {
    			 storePopState(popState);
    		}
    	};

    	return [
    		popState,
    		state,
    		confirmDelete,
    		inputValue,
    		removeStashedItem,
    		toggleConfirmOrDelete,
    		handleClick,
    		handleConfirmedInput,
    		$$scope,
    		slots,
    		input0_input_handler,
    		submit_handler,
    		click_handler,
    		click_handler_1,
    		input1_change_handler,
    		$$binding_groups,
    		click_handler_2,
    		input2_change_handler,
    		click_handler_3
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Sidebar({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=sidebar.js.map
