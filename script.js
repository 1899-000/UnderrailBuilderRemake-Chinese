(function UnderrailCharacterBuilder() {
	'use strict'; /* jshint validthis:true */

	class Stat {
		constructor(id, name, length) {
			this.id = id;
			this.name = name;
			this._value = 0;
			this.bonus = 0;
			this.multiplier = 1;
			this.length = length;
		}
		get element() { // lazy getter for static element refs
			Object.defineProperty(this, 'element', {
				value: document.getElementById(this.id)
			});
			//console.log('Cached DOM ref of', this);
			return this.element;
		}
		get value() { return this._value; }
		set value(n) { this._value = n; }
		update() {
			if (this._prevVal !== this.value) {
				this._prevVal  =  this._value;
				writeToDOM(this.length, this.element, this.value);
			}
		}
	}
	class BaseAbility extends Stat {
		constructor(id, increasedBaseAbilityFeatId, name, relatedSkills) {
			super(id, name, 4);
			this.relatedSkills = relatedSkills || [];
			this.ibaFeat = increasedBaseAbilityFeatId;
		}
		get effVal() { return (this._effVal = Math.min(Math.max(this.value + this.bonus, 1), this.value + 10)); }
		get value() { return this._value + feats[this.ibaFeat].owned*2; }
		update() {
			// get this.effVal only once, it sets this._effVal
			if (this._prevEffVal !== this.effVal || this._prevVal !== this.value) {

				let effectiveValue;
				if (this._effVal > 0 && this._effVal !== this.value) {
					effectiveValue = '('+this._effVal+')';
					this._ShowEV = true;
				} else {
					effectiveValue = '';
					this._ShowEV = false;
				}
				if (this._prevEVT !== this._ShowEV || this._prevEffVal !== this._effVal) {
					this._prevEVT  =  this._ShowEV;
					writeToDOM(this.length, this.element.children[1], effectiveValue);
				}
				this._prevEffVal  =  this._effVal;
				// always get this.value to account for IBAFeat, do NOT set it
				if (this._prevVal !== this.value) {
					this._prevVal  =  this.value;
					writeToDOM(this.length, this.element.children[0], this.value);
				}
			}
		}
	}
	class Skill extends Stat {
		constructor(id, relatedBaseAbility, name, synergies) {
			super(id, name, 5);
			this.relatedBase = relatedBaseAbility;
			this.synergies = synergies || {};
			this.multiplier = 100;
		}
		get effVal() {
			const baseSkill = this._value;
			const modifiedSkill = baseSkill * baseAbilityMod(this.relatedBase.effVal) |0;
			let synergies = 0, wastedSyn = 0;

			for (var id in this.synergies) {
				synergies += skills[id].value * this.synergies[id] / 100 |0;
			}
			wastedSyn = Math.max(0, modifiedSkill + synergies - maxSkill(lvl.value));
			synergies = Math.max(0, synergies-wastedSyn);
			this.element.children[1].classList.toggle('synergies', synergies);

			// TODO cleanup
			let tattooTemp = 0;
			tattooTemp += (xpblFeats[193].owned && this.id.match(/per/))? 15 : 0; // Tattoo: JKK
			tattooTemp += (xpblFeats[195].owned && this.id.match(/mec|ele/))? 7 : 0; // Tattoo: Coretech
			tattooTemp += (xpblFeats[197].owned && this.id.match(/gun|thr|cro|mel/))? 5 : 0; // Tattoo: Aegis Incorporated
			tattooTemp += (xpblFeats[198].owned && this.id.match(/eva|dod/))? 10 : 0; // Tattoo: Magnar's Ghost
			tattooTemp += (xpblFeats[202].owned && this.id.match(/bio|che/))? 7 : 0; // Tattoo: The Institute of Tchort
			tattooTemp += (xpblFeats[204].owned)? 2 : 0; // Tattoo: South Gate Station
			tattooTemp += (xpblFeats[215].owned && this.id.match(/ste/))? baseSkill*0.15|0 : 0; // Tattoo: Black Crawler
			this.bonus += tattooTemp;

			const effectiveSkill = (modifiedSkill + synergies + this.bonus) * this.multiplier / 100 |0;

			const sign = n => n < 0? n : '+'+n;
			this.element.title = baseSkill+' 基础技能值'+
			'\n'+sign(modifiedSkill-baseSkill)+' 来自 '+this.relatedBase.name+' ('+Math.round(baseAbilityMod(this.relatedBase.effVal)*100)+'%)'+
			'\n'+sign(synergies)+' 来自技能协同'+(wastedSyn? '\n ('+wastedSyn+' 点数超过当前等级\n  最大协同值限制)' : '')+
			'\n'+sign(this.bonus)+' 来自 固定增幅'+
			'\n'+sign(effectiveSkill-modifiedSkill-synergies-this.bonus)+' 来自 '+(this.multiplier)+'% 修正'+
			'\n━━━━━━━━━━━━━━━━━━━━━━━━━━'+
			'\n'+Math.max(0, effectiveSkill)+' 有效技能值';

			this.bonus -= tattooTemp;

			return (this._effVal = Math.max(0, effectiveSkill));
		}
		update() {
			// get this.effVal only once, it sets this._effVal
			if (this._prevEffVal !== this.effVal || this._prevVal !== this._value) {

				let effectiveValue;
				if (this._effVal > 0 && this._effVal !== this._value) {
					effectiveValue = '('+this._effVal+')';
					this._ShowEV = true;
				} else {
					effectiveValue = '';
					this._ShowEV = false;
				}
				if (this._prevSEV !== this._ShowEV || this._prevEffVal !== this._effVal) {
					this._prevSEV  =  this._ShowEV;
					writeToDOM(this.length, this.element.children[1], effectiveValue);
				}
				this._prevEffVal  =  this._effVal;

				if (this._prevVal !== this._value) {
					this._prevVal  =  this._value;
					writeToDOM(this.length, this.element.children[0], this.value);
				}

				switch (this.id) {
				case 'gun':
				case 'cro':
				case 'mel':
				case 'thr':
				case 'hea':
					updateDamageBonus(this.id, this._effVal);
					break;
				}
			}
		}
	}
	class Feat extends Stat {
		constructor(id, name, func, description) {
			super(id, name);
			this.data = func.toString().substr(4);
			this.description = description;
			this.level = this.calcFeatLevel();
			this.isPurchasable = !this.data.includes('"special"');
			this.isVeteran = this.data.includes('lvl.value>=26');
			this.searchtext = '';
			this.tooltip = '';
			this.cfid = 'cf-' + this.id;
			this.evaluate = func;
		}
		get owned() { return this.element.classList.contains('selected'); }
		get specializations() {
			let arr = [];
			for (let i = 10000 + this.id*10, l = i+10; i < l; i++) {
				if (specs[i]) { arr.push(specs[i]); } else { break; }
			}
			Object.defineProperty(this, 'specializations', { value: arr });
			return arr;
		}
		calcFeatLevel() {
			const reExec = regexp => {
				let arr = [0], result;
				while ((result = regexp.exec(this.data)) !== null) {
					arr.push(result[1] |0);
				}
				return arr;
			};
			const skillReqs = reExec(/(?:skills\.\w+\.value>=|anyPsiSkill\()(\d+)/g);
			const baseReqs  = reExec(/base\.\w+\.value>=(\d+)/g);
			const levelReqs = reExec(/lvl.value>=(\d+)/g);

			return Math.max(1,
				(Math.max(...skillReqs) - 10) / 5,
				baseReqs.reduce((acc,cur) => acc + Math.max(0, cur-10), 0) * 4,
				...levelReqs
			);
		}
		parseRequirements() { // requires DOMContentLoaded
			const ctx = { base:base, skills:skills, feats:feats, xpblFeats:xpblFeats, dlc2Feats:dlc2Feats };
			const toFeatName = (...a) => '专长: '+ctx[a[1]][a[2]].name;
			const toStatName = (...a) => ctx[a[1]][a[2]].name+' '+a[3];
			const reqs = this.data
				.replace(/&&/g, '\n- ')
				.replace(/\|\|/g, ' 或 ')
				.replace(/true/, '无')
				.replace(/\"special\"/, '此专长通过升级之外获得')
				.replace(/!/g, '受限')
				.replace(/(feats|xpblFeats)\[(\d+)\]\.owned/g, toFeatName)
				.replace(/(base|skills)\.(...)\.value>=(\d+)/g, toStatName)
				.replace(/anyPsiSkill\(/, '任何灵能技能 ')
				.replace(/featGroup\(0,\d+\)/, '专长: 其他基础属性增强专长')
				.replace(/featGroup\(1,\d+\)/, '专长: 其他强效释放专长')
				.replace(/featGroup\(2,\d+\)/, '专长: 其他淬炼专长')
				.replace(/featGroup\(3,\d+\)/, '专长: 其他纹身')
				.replace(/lvl.value>=/, '等级 ')
				.replace(/\(|\)/g, '')
				.replace(/ or (?=.* or )/g, ', ') // positive lookahead: all but last " or "
				.replace(/ \d+(?=.* \d+)/g, ''); // all but last digits
			return reqs;
		}
		add() {
			this.element.classList.add('selected');
			this.toggleSpecializations(true);
			document.getElementById('chosenfeats').appendChild(this.createChosenFeat());
		}
		remove() {
			this.element.classList.remove('selected');
			this.toggleSpecializations(false);
			document.getElementById('chosenfeats').removeChild(document.getElementById(this.cfid));
		}
		toggleSpecializations(enable) {
			for (var spec of this.specializations) {
				spec.element.parentNode.classList.toggle('disabled', !enable);
				spec.element.nextSibling.disabled = !enable;
				spec.element.nextSibling.nextSibling.disabled = !enable;
				if (!enable && spec.value > 0) {
					specPoints.value += spec.value;
					spec.value = 0;
				}
			}
		}
		createChosenFeat() {
			const cf = document.createElement('p');
			cf.textContent = this.name;
			cf.setAttribute('data-tooltip', this.tooltip);
			cf.classList.add('draggable', 'chosenfeat');
			cf.classList.toggle('veteran', this.isVeteran);
			cf.classList.toggle('trainable', !this.isPurchasable);
			cf.onmousedown = dragStart;
			// 移除 onmouseover 和 onmouseup（改用 document 级监听）
			cf.ontouchstart  = dragStart;
			cf.ontouchmove   = (e) => touchSystem.dragHandler(e);
			cf.ontouchend    = dragEnd;
			cf.ontouchcancel = dragEnd;
			cf.id = this.cfid;
			cf.ogId = this.id;
			return cf;
		}
		toggle() {
			if (this.id === 231) { // Polymath
				// 不需要额外操作，calcSkillPoints 会自动处理
			}
			if (this.id === 232) { // Specialist
				// 不需要额外操作，calcSpecPoints 会自动处理
			}
			//if (this.id === 231) { // Polymath
			//	if (!this.owned) {
			//		 ABOUT to be taken
			//		this.polyLevel = lvl.value;
			//		skillPoints._value += 15;
			//	} else {
			//		 ABOUT to be removed
			//		const levelsWithPoly = lvl.value - this.polyLevel;
			//		skillPoints._value -= 15 + levelsWithPoly * 5;
			//	}
			//}

			//if (this.id === 232) { // Specialist
			//	if (!this.owned) {
			//		 ABOUT to be taken
			//		this.speclevel = lvl.value;
			//		specPoints._value += 1;
			//	} else {
			//		 ABOUT to be removed
			//		const levelsWithSpec = lvl.value - this.speclevel;
			//		specPoints._value -= 1 + levelsWithSpec * 1;
			//	}
			//}


			if (this.owned) {
				if (this.isPurchasable) featPoints.value += 1;
				this.remove();
			} else {
				if (!this.isPurchasable) {
					this.add();
				} else if (featPoints.value > 0) {
					featPoints.value -= 1;
					this.add();
				} else return false;
			}
			if (this.id === 218) { base.INT._value += this.owned? -1 : +1; base.INT.update(); } // Motioner

			updateChosenFeats();
		}
		update() {
			this.element.disabled = !this.evaluate();

			if (this.owned && this.element.disabled) {
				this.toggle();
			}
		}
	}
	class Specialization extends Stat {
		constructor(id, maxPoints, name, bonusPerPoint, description, dlc) {
			super(id, name, 8);
			this.max = maxPoints;
			this.bonus = bonusPerPoint;
			this.description = description;
			this.searchtext = '';
			this.dlc = dlc;
			this.prevVal = 0;
		}
		get relatedFeat() { return feats[this.id/10-1000 |0]; }
		get available() { return this.relatedFeat.element.classList.contains('selected'); }
		get effect() { return this.value * this.bonus; }
		update() {
			if (this._prevVal !== this.value) {
				this._prevVal  =  this._value;
				writeToDOM(this.length, this.element, '  '+this.value+' / '+this.max+' ');
				this.element.parentNode.parentNode.classList.toggle('chosenspec', this.value);
				this.element.classList.toggle('chosenspecrank', this.value);
				this.element.previousSibling.classList.toggle('chosenspecname', this.value);
				this.relatedFeat && this.relatedFeat.owned && updateChosenSpecs(this.relatedFeat); // TODO cleanup
			}
		}
	}
	class DerivedStat extends Stat {
		constructor(id, func) {
			super(id, undefined, 4);
			this.calc = func;
		}
		get value() { return (this._value = this.calc()); }
	}
	class Item {
		constructor(stats, ...bonuses) {
			this.stats = stats || {};
			this.bonusPairs = bonuses;
		}
		addStats() { this.toggle(1); }
		removeStats() { this.toggle(-1); }
		toggle(num) {
			for (var [target, points] of this.bonusPairs) {
				points *= num;

				if (typeof target === 'function') {
					//console.log('args', points, 'to', target);
					target(points);

				} else if (Array.isArray(target)) {
					for (var stat of target) {
						//console.log('adding', points, 'to', stat);
						stat.bonus += points;
					}

				} else {
					//console.log('adding', points, 'to', target);
					target.bonus += points;
				}
			}
		}
		static swapEquipped(slot, item) {
			const oldItem = slot.equipped;
			const newItem = slot[item];
			// swap item before running unequip functions
			slot.equipped = newItem;
			oldItem.removeStats();
			newItem.addStats();
			updateDamageBonus('mel', skills.mel.effVal);
		}
		static checkEquippedReqs() {
			//let changed = false;
			for (var slot in items) {
				let reqs = items[slot].equipped.stats.reqs;
				if (reqs) {
					for (var [stat, required] of reqs) {
						if (stat.value < required) {
							var el = document.getElementById(slot);
							alert('当前属性或技能未满足物品需求!\n - '+el.children[el.selectedIndex].innerText+' ('+stat.name+' '+required+')');
							el.selectedIndex = 0;
							Item.swapEquipped(items[slot], 'none');
							//changed = true;
						}
					}
				}
			}
			//if (changed) { updatePage(); }
		}
		static junkfoodEffect(num) {
			const getRndStat = arr => arr.splice(Math.random()*arr.length |0, 1).toString();
			if (num > 0) {
				items.statbuffs.jyStat1 = getRndStat(['STR','DEX','AGI','CON']);
				items.statbuffs.jyStat2 = getRndStat(Object.keys(base));
				items.statbuffs.jyBuff1 = 1+Math.random()*2 |0; // 1-2
				items.statbuffs.jyBuff2 =   Math.random()*3 |0; // 0-2
			}
			base[items.statbuffs.jyStat1].bonus += items.statbuffs.jyBuff1*num;
			base[items.statbuffs.jyStat2].bonus -= items.statbuffs.jyBuff2*num;
		}
	}

	/* misc. global state */
	const maxSkill = lvl => 10 + 5*lvl, maxBase = lvl => 10 + Math.min(25, lvl)/4 |0, version = '1.3.1.2';
	let dragging = false, draggedElem, loading, fileData, expedition = false, heavyduty = false;

	/* game data, used with permission from Stygian Software */
	const lvl = new Stat('lvl', 'Level', 2); lvl.max = 25;
	const basePoints = new Stat('basepts', 'Base Ability points', 2);
	const skillPoints= new Stat('skillpts','Skill points', 4);
	const featPoints = new Stat('featpts', 'Feat points', 2);
	const specPoints = new Stat('specpts', 'Specialization points', 2);
	const base = {
		STR: new BaseAbility('STR', 182, '力量', ['mel'] ),
		DEX: new BaseAbility('DEX', 179, '灵巧', ['mel', 'thr', 'loc', 'pic', 'tra'] ),
		AGI: new BaseAbility('AGI', 177, '敏捷', ['dod', 'eva', 'ste'] ),
		CON: new BaseAbility('CON', 178, '体质'),
		PER: new BaseAbility('PER', 181, '感知', ['gun', 'cro'] ),
		WIL: new BaseAbility('WIL', 183, '意志', ['tho', 'met', 'psy', 'tem', 'per', 'ind'] ),
		INT: new BaseAbility('INT', 180, '智力', ['hac', 'mec', 'ele', 'che', 'bio', 'tai', 'mer'] )
	};
	const skills = {
		gun: new Skill('gun', base.PER, '枪械', { hea:75 } ),
		hea: new Skill('hea', base.PER, '重型枪械', { gun:65 } ),
		thr: new Skill('thr', base.DEX, '投掷'),
		cro: new Skill('cro', base.PER, '弩'),
		mel: new Skill('mel', base.STR, '近战'),
		dod: new Skill('dod', base.AGI, '闪避', { eva:10 } ),
		eva: new Skill('eva', base.AGI, '躲闪', { dod:10 } ),
		ste: new Skill('ste', base.AGI, '潜行'),
		hac: new Skill('hac', base.INT, '黑客', { ele:10 } ),
		loc: new Skill('loc', base.DEX, '开锁', { mec:10, tra:10 } ),
		pic: new Skill('pic', base.DEX, '偷窃'),
		tra: new Skill('tra', base.DEX, '陷阱', { loc:10, mec:10 } ),
		mec: new Skill('mec', base.INT, '机械'),
		ele: new Skill('ele', base.INT, '电子'),
		che: new Skill('che', base.INT, '化学', { bio:10 } ),
		bio: new Skill('bio', base.INT, '生物', { che:15 } ),
		tai: new Skill('tai', base.INT, '裁缝'),
		tho: new Skill('tho', base.WIL, '精神控制', { psy:10, met:10, tem:10 } ),
		psy: new Skill('psy', base.WIL, '念动力', { tho:10, met:10, tem:10 } ),
		met: new Skill('met', base.WIL, '热力操纵', { tho:10, psy:10, tem:10 } ),
		tem: new Skill('tem', base.WIL, '时间操纵', { tho:10, psy:10, met:10 } ),
		per: new Skill('per', base.WIL, '说服', { mer:20 } ),
		ind: new Skill('ind', base.WIL, '恐吓', { per:10 } ),
		mer: new Skill('mer', base.INT, '商业', { per:20 } )
	};
	Object.defineProperty(skills.mel, 'relatedBase', { get: () => base.STR.effVal >= base.DEX.effVal? base.STR : base.DEX });
	Object.defineProperty(skills.ind, 'relatedBase', { get: () => base.WIL.effVal >= base.STR.effVal? base.WIL : base.STR });
	const allBaseArray = Object.values(base), allSkillsArray = Object.values(skills), psiSkillsArray = [skills.tho, skills.psy, skills.met, skills.tem];
	setEnumerable(skills, 'tem', false);
	setEnumerable(skills, 'hea', false);
	const feats = {
		0: new Feat(0,'武器匠',()=>base.INT.value>=6&&skills.mec.value>=25,'你制作的非拳套近战武器暴击几率提高5%。'),
		1: new Feat(1,'瞄准射击',()=>base.PER.value>=6&&(skills.gun.value>=10||skills.cro.value>=10),'你可以使用任何单目标远程武器进行一次瞄准射击，必定造成暴击。\n\n冷却时间：3回合。'),
		2: new Feat(2,'伏击',()=>base.PER.value>=6&&skills.ste.value>=40,"当使用单目标远程武器从黑暗处攻击被照明的目标时，你无视目标一半的躲闪，暴击几率提高20%，每点潜行技能点使暴击几率额外提高0.3%。"),
		3: new Feat(3,'碎骨者',()=>base.STR.value>=7&&skills.mel.value>=45,"你的钝器近战攻击的暴击如果通过机械伤害造成至少目标最大生命值4%的伤害，则会打断肋骨。肋骨断裂的目标受到的所有来源的机械伤害增加25%。\n\n此效果持续3回合，最多叠加2层。仅对确有肋骨的目标有效。"),
		4: new Feat(4,'窃贼',()=>base.DEX.value>=6&&(skills.loc.value>=15||skills.hac.value>=15),'开锁和骇入所需时间减少75%。同时在受控区域为你提供+10点潜行技能加成。'),
		5: new Feat(5,'额叶损伤',()=>skills.tho.value>=25&&feats[43].owned,"使你的'神经过载'灵能能力的基础伤害提高20%。此外，每当命中时，还会减少目标10%的最大灵能储备。"),
		6: new Feat(6,'恶意中伤',()=>base.DEX.value>=6&&base.INT.value>=5&&skills.mel.value>=40,'你的近战攻击的暴击伤害加成提高50%，并使你的近战攻击有8%的几率使目标失能，持续1回合。'),
		7: new Feat(7,'组合拳',()=>skills.mel.value>=65&&base.DEX.value>=8,'如果你在一回合内对单一目标连续命中三次造成伤害的徒手或拳套武器攻击，第三次攻击将造成100%的额外伤害，并有20%的几率使目标眩晕1回合。'),
		8: new Feat(8,'身体调节',()=>base.CON.value>=5,'使你受到的所有机械、热能和寒冷伤害减少10%，外加每点体质超过5点时额外减少1%。'),
		9: new Feat(9,'致残打击',()=>skills.mel.value>=30,"一次徒手、拳套武器或匕首攻击，造成150%伤害，如果穿透护甲，则降低目标2点力量。持续5回合。最多叠加3层。\n\n仅对活体目标有效。\n\n冷却时间：1回合。"),
		10: new Feat(10,'寒冰刺骨',()=>skills.met.value>=50&&feats[43].owned,"使你灵能能力的寒冷效果持续时间增加1回合，并允许你在攻击造成超过目标剩余生命值50%的伤害时，击碎被你冰封的目标（仅考虑造成的机械和寒冷伤害）。"),
		11: new Feat(11,'割喉',()=>base.DEX.value>=10&&skills.mel.value>=55&&skills.ste.value>=45,'你可以从目标背后发动一次强力的匕首潜行攻击，该攻击无视所有抗性和护盾，施加一个流血伤口，在3回合内造成额外800%伤害，并使目标眩晕相同时间。\n\n你必须通过潜行对目标保持隐藏，或者目标需要处于失能状态。仅对人类有效。\n\n动作点数消耗：15。冷却时间：6回合。 '),
		12: new Feat(12,'挡拆',()=>base.DEX.value>=6&&skills.mel.value>=35,'当徒手或持拳套武器时，闪避增加，增加值为近战技能的30%。'),
		13: new Feat(13,'撩阴腿',()=>skills.mel.value>=25,"你可以发动一次特殊的近战攻击，消耗15点动作点数，造成提升的徒手伤害并使活体目标眩晕1回合。如果目标是男性人形生物，则眩晕2回合。\n\n此攻击不受当前装备武器的影响。伤害随你的徒手攻击伤害提升。\n\n冷却时间：6回合。 "),
		14: new Feat(14,'医生',()=>skills.bio.value>=15,'你可以使用绷带治疗任何伤口。你从回复生命的药物中回复的生命值额外增加25%。'),
		15: new Feat(15,'机动躲闪',()=>base.AGI.value>=6&&skills.eva.value>=50,'授予你一种能力，激活后将所有剩余的移动点数转化为三倍的躲闪，持续2回合。\n\n冷却时间：3回合。'),
		16: new Feat(16,'剔骨',()=>base.DEX.value>=8&&skills.mel.value>=80,'授予你一种特殊的匕首攻击，移除目标所有流血伤口，并且每移除一个流血伤口额外造成50%的伤害。\n\n冷却时间：1回合。'),
		17: new Feat(17,'处决',()=>skills.gun.value>=70&&feats[38].owned,'使你获得手枪的特殊近程攻击，对眩晕和失能的目标造成250%武器伤害。不适用于能对多个目标造成伤害的手枪。比普通攻击多消耗5点动作点数。\n\n冷却时间：5回合。'),
		18: new Feat(18,'弱点暴露',()=>skills.mel.value>=40&&base.INT.value>=5,"你可以发动一次特殊的近战攻击，造成正常伤害，如果命中，则在2回合内降低目标的机械抗性和阈值30%，每点智力额外降低2%。对非活体目标效果减半。\n\n冷却时间：5回合。"),
		19: new Feat(19,'花式步法',()=>base.AGI.value>=7&&skills.mel.value>=40&&skills.dod.value>=40,'当你的近战攻击命中一次时，根据你的护甲惩罚，获得最多8点移动点数。每回合可触发多次，但每次触发效果减少1点动作点数。\n\n这不能使你的移动点数超过正常最大值的两倍。'),
		20: new Feat(20,'念力使者',()=>base.WIL.value>=7&&skills.psy.value>=25&&feats[43].owned,'原力与你同在。\n\n你的念力拳伤害提高100%，你的念力场生命值增加50%且持续时间延长2回合，你的念力外放灵能消耗减少1。'),
		21: new Feat(21,'全自动',()=>base.STR.value>=7&&(skills.gun.value>=40||skills.hea.value>=40),'如果你足够强壮以承受后坐力，你可以在突击步枪、冲锋枪、轻机枪和转轮机枪的连射攻击中额外发射2发子弹，在霰弹枪连射中额外发射1发弹丸。'),
		22: new Feat(22,'手雷专家',()=>base.DEX.value>=6&&skills.thr.value>=30,'减少破片、高爆和燃烧手榴弹的冷却时间2回合，以及特殊手榴弹的冷却时间3回合。'),
		23: new Feat(23,'枪手',()=>base.DEX.value>=7&&skills.gun.value>=15,'使用手枪时，所需动作点数减少3点，且持有时先攻提高7。仅适用于火器。'),
		24: new Feat(24,'重拳',()=>base.STR.value>=5&&skills.mel.value>=15,'你可以发动一次无条件徒手或拳套武器攻击，造成300%伤害，消耗150%动作点数。\n\n冷却时间：3回合。'),
		25: new Feat(25,'游击战',()=>base.AGI.value>=7,'每当你用近战或远程武器杀死一个敌人时，如果你的移动点数低于25点，则将其重置为25点（不能超过你的最大移动点）。\n\n这在同一回合内可以发生多次，但后续每次发生时效果减半。'),
		26: new Feat(26,'猎人',()=>"special",'你使用弩、刀和长矛对非人形生物造成的伤害提高20%。'),
		27: new Feat(27,'剧毒',()=>skills.bio.value>=35,'你施加的毒药造成的伤害提高100%。'),
		28: new Feat(28,'低温症',()=>skills.met.value>=40&&feats[43].owned,"你的寒冷系热力操纵灵能能力还会降低目标1点体质。此效果最多叠加5层，持续最多24回合。\n\n可被寒冷抗性减免，免疫寒冷和冰冻效果的目标也免疫低温症。"),
		29: new Feat(29,'潜行者',()=>base.AGI.value>=7&&skills.ste.value>=20,'将潜行时的移动速度惩罚降低至30%，并允许你在潜行进入战斗时保留最多15点移动点数。'),
		30: new Feat(30,'碎膝射击',()=>base.PER.value>=7&&(skills.gun.value>=25||skills.cro.value>=25),'一个手枪、弩、冲锋枪或霰弹枪能使用的特殊攻击，造成正常武器伤害，并施加一个流血伤口，在3回合内造成125%的原始伤害，并在相同持续时间内移除所有移动点数。\n\n仅对活体目标（有膝盖的目标）有效。\n\n冷却时间：5回合。'),
		31: new Feat(31,'背水一战',()=>base.CON.value>=9&&lvl.value>=5,'授予你一种能力，激活后暂时将你的生命值重置为最大值，持续2回合。效果结束后，你的生命值将降至1点。\n\n冷却时间：10回合。'),
		32: new Feat(32,'闪电拳',()=>base.DEX.value>=8&&skills.mel.value>=25,'当你的护甲惩罚低于20%时，你的徒手和拳套武器攻击动作点数消耗减少2点。'),
		33: new Feat(33,'控制心核',()=>base.WIL.value>=10&&skills.tho.value>=75&&feats[43].owned,'你是自己命运的主宰。\n\n激活此能力以移除并获得对眩晕、恐惧、失能和精神控制的免疫，持续3回合。\n\n当此效果激活时，你释放的下一个精神控制灵能能力将成为范围效果，但释放后会结束该效果。\n\n冷却时间：15回合。'),
		34: new Feat(34,'神射手',()=>base.DEX.value>=5&&skills.cro.value>=15,'移除使用特殊弩箭射击时的额外动作点数消耗。'),
		35: new Feat(35,'精神破坏',()=>base.WIL.value>=6&&skills.tho.value>=30&&feats[43].owned,'你每对目标命中一次攻击性精神控制灵能能力，就会少量降低其坚毅，最终最多可叠加至75%。'),
		36: new Feat(36,'灵活',()=>true,'护甲惩罚减少15%，并且如果你的护甲惩罚为零，则闪避和躲闪提高15%。'),
		37: new Feat(37,'扒窃大师',()=>true,'扒窃时间减少50%。同时在目标未察觉时扒窃所提升的怀疑度降低25%。'),
		38: new Feat(38,'机会主义者',()=>true,'使用武器（范围效果武器除外）、徒手攻击和飞刀时，对被固定、眩晕和失能的目标造成的伤害提高25%，对减速目标造成的伤害提高15%。\n\n仅对活体目标有效。'),
		39: new Feat(39,'搬运鼠',()=>true,'负重增加50。'),
		40: new Feat(40,'偏执狂',()=>true,'每个人都想加害于你，而你心知肚明。侦测提高20%，先攻提高5，受到武器和徒手攻击暴击的几率降低3%。同时，你对潜行目标的武器和徒手伤害提高30%。'),
		41: new Feat(41,'能源管理',()=>base.INT.value>=7&&skills.ele.value>=15,'你制作的电子设备的能量容量增加35%。'),
		42: new Feat(42,'预谋',()=>base.INT.value>=6&&anyPsiSkill(40)&&feats[43].owned,'激活此能力将使你的下一个灵能能力的灵能消耗降低50%，动作点数消耗降低100%，其作用范围提高3。引导类能力的范围不增加。\n\n冷却时间：5回合。'),
		43: new Feat(43,'灵能亲和',()=>"special",'允许角色学习和使用灵能能力，但其基础生命值减少20%。'),
		44: new Feat(44,'精神错乱',()=>feats[43].owned&&!feats[63].owned,'将所有灵能能力的暴击几率提高15%，但也将其灵能消耗提高20%。'),
		45: new Feat(45,'痛打',()=>skills.mel.value>=20,'你可以发动一次特殊的长柄锤攻击，造成50%武器伤害，并且不忽视伤害阈值，但如果命中，会使活体目标失去平衡，持续2回合，且仅消耗10点动作点数。\n\n失去平衡的角色闪避和躲闪降至零。\n\n冷却时间：1回合'),
		46: new Feat(46,'纵火狂',()=>skills.met.value>=35&&feats[43].owned,'每当你使用火焰系灵能能力造成伤害时，有一定几率点燃目标，在3回合内再次造成该伤害的100%。\n\n点燃活体目标会使他们陷入极度恐慌状态。'),
		47: new Feat(47,'快速口袋',()=>true,'为你提供一个额外的物品栏位，并减少战斗中装备物品的动作点数消耗50%。'),
		48: new Feat(48,'快速布置',()=>base.DEX.value>=7&&skills.tra.value>=25,'授予你一种能力，激活后将允许你瞬间布置一个陷阱，包括在战斗中。在战斗中布置消耗25点动作点数。\n\n冷却时间：5回合。'),
		49: new Feat(49,'鲁莽',()=>true,'你的武器和徒手攻击暴击几率提高7%，但你受到武器和徒手攻击以及灵能能力暴击的几率提高3%。'),
		50: new Feat(50,'推销员',()=>base.INT.value>=6&&skills.mer.value>=35,'每点商业技能增加商人愿意向你购买的物品数量1%。'),
		51: new Feat(51,'神射手',()=>base.PER.value>=10&&(skills.gun.value>=60||skills.cro.value>=60)&&feats[1].owned,'当你完全专注时，增加你使用手枪、弩和狙击步枪的暴击伤害加成30%。火器手枪无论专注与否，始终获得此加成。'),
		53: new Feat(53,'狙击',()=>base.PER.value>=10&&(skills.gun.value>=35||skills.cro.value>=35)&&skills.ste.value>=30&&feats[1].owned,'使你获得使用弩或狙击步枪的特殊攻击，造成225%武器伤害，每点潜行技能额外增加1%伤害。只能在潜行状态下使用。此攻击无法暴击。\n\n冷却时间：3回合'),
		54: new Feat(54,'嗅探',()=>true,'探查隐藏通道和其他秘密时感知视为提高3点。'),
		55: new Feat(55,'特工',()=>base.AGI.value>=6&&skills.gun.value>=50,'使用冲锋枪时，将连射攻击的动作点数消耗修正从300%降低到200%。同时减少闪光弹和类似战术手榴弹的冷却时间1回合。'),
		56: new Feat(56,'特殊战术',()=>base.INT.value>=6&&skills.cro.value>=50,'授予你一种能力，激活后将移除你下一次特殊弩箭攻击的动作点数消耗。此能力只能在脱离战斗时激活。\n\n冷却时间：30秒。'),
		57: new Feat(57,'冲刺',()=>base.AGI.value>=6,'你可以激活"冲刺"能力，为你提供30点额外移动点数，持续2回合。仅在非潜行状态下有效。\n\n冷却时间：10回合。'),
		58: new Feat(58,'稳定瞄准',()=>base.STR.value>=5&&base.DEX.value>=6&&skills.gun.value>=25,'对于基础开火所需动作点数超过10点的手枪，超过的每一点使其暴击几率额外增加0.5%。'),
		59: new Feat(59,'火力压制',()=>base.PER.value>=6&&(skills.gun.value>=10||skills.hea.value>=10),"位于你突击步枪、冲锋枪或霰弹枪连射攻击锥形范围内的敌人（无论是否被击中）将在1回合内，其远程命中率降低10%，动作点数减少5点，移动点数减少10点。"),
		60: new Feat(60,'嗜血',()=>skills.mel.value>=50,'每当你用近战武器攻击一个流血目标时，根据目标身上的流血伤口数量，你的近战伤害提高5%。最多可叠加10次。击杀活体目标也会提供一层，无论流血伤口数量。\n\n如果未刷新，则在1回合后失效。'),
		61: new Feat(61,'热动平衡',()=>skills.met.value>=30&&feats[43].owned,'施加热能系灵能能力后，你会获得"热力动态"效果，使你的下一个寒冷系灵能能力的动作点数消耗减少50%，反之亦然。\n\n如果未使用，此加成将在2回合后失效。'),
		62: new Feat(62,'三分球',()=>base.DEX.value>=7&&skills.thr.value>=50,'使你的伤害型手榴弹有10%的几率暴击。投掷技能每高于50的每10点再增加1.5%暴击率。'),
		63: new Feat(63,'宁静',()=>feats[43].owned&&!feats[44].owned,'在满生命值时，将所有灵能能力的动作点数消耗降低5点。'),
		64: new Feat(64,'陷阱专家',()=>base.DEX.value>=6&&skills.tra.value>=30,'设置陷阱所需时间减少60%，并且你设置的陷阱的侦测难度增加25%。'),
		65: new Feat(65,'直觉闪避',()=>skills.dod.value>=40&&base.AGI.value>=8,'授予你一种能力，激活后将使你闪避接下来的2次针对你的常规或特殊近战攻击，外加每30点闪避额外闪避一次攻击。\n\n冷却时间：5回合。'),
		66: new Feat(66,'阴毒兵器',()=>skills.bio.value>=10&&(skills.cro.value>=25||skills.mel.value>=25||skills.tra.value>=25),'每当你用冷兵器、护甲强化或陷阱造成流血伤口时，还会施加感染伤口，使目标受到的所有来源伤害增加10%，治疗效果减少25%。最多叠加3层。'),
		67: new Feat(67,'摔跤',()=>base.STR.value>=7&&skills.mel.value>=40,"当你用拳套武器或徒手攻击击中活体目标时，有50%的几率降低目标8点移动点数，3点动作点数，以及7%的所有远程武器命中率。最多叠加5层。"),
		68: new Feat(68,'怒吼',()=>skills.ind.value>=20,'你可以发出一声令人生畏的吼叫，降低周围敌人的战备状态并移除其潜行状态。所有受影响的敌人将在3回合内，其攻击技能降低相当于你威吓技能35%的数值。\n\n冷却时间：10回合。'),
		69: new Feat(69,'护甲改装',()=>base.INT.value>=6&&skills.mec.value>=15,'制作护甲时，源自金属板的护甲惩罚减少35%（乘算）。'),
		70: new Feat(70,'弹道学',()=>base.INT.value>=6&&skills.tai.value>=35,'你制作的防弹背心拥有额外3点机械伤害阈值。'),
		71: new Feat(71,'闪电战',()=>lvl.value>=10&&base.AGI.value>=10,'授予你一种能力，激活后将立即将所有移动点数转换为动作点数，每3点移动点数转换为1点动作点数，最多转换20点动作点数。\n\n冷却时间：10回合。'),
		72: new Feat(72,'制衣匠',()=>base.INT.value>=7&&skills.tai.value>=15,'在制作中，织物的品质视为提高20%。'),
		73: new Feat(73,'突击队员',()=>skills.gun.value>=80,'使用突击步枪或冲锋枪连射攻击杀死一个敌人，将获得一次额外的免费连射攻击，可以在同一回合内执行。每回合只能触发一次。'),
		74: new Feat(74,'集中火力',()=>base.PER.value>=8&&(skills.gun.value>=60||skills.hea.value>=60),'突击步枪连射攻击的每次命中都会使后续连射命中造成的伤害提高10%。最多叠加10层，持续到回合结束。'),
		75: new Feat(75,'强力暴击',()=>skills.mel.value>=75||skills.gun.value>=75||skills.hea.value>=75||skills.cro.value>=75,'武器和徒手攻击的暴击伤害超过100%的每1%，将使你获得额外1%的暴击伤害加成。'),
		76: new Feat(76,'致命诱捕',()=>base.PER.value>=10&&skills.cro.value>=75&&skills.tra.value>=50,'你用弩攻击被困在捕熊夹和酸性纠缠中的目标总是暴击。'),
		77: new Feat(77,'拆解',()=>base.INT.value>=7&&(skills.ele.value>=20||skills.mec.value>=20),'授予你一个蓝图，使你能够拆解标记为可拆解的物品，获得其构成的组件。回收的组件具有原始品质的90%。'),
		78: new Feat(78,'逃脱专家',()=>base.DEX.value>=7&&skills.dod.value>=30,'授予一个特殊技能，激活后移除所有固定效果。\n\n冷却时间：2回合。'),
		79: new Feat(79,'专业知识',()=>true,'你的非暴击弩、近战和子弹类火器攻击造成额外机械伤害，数值等于你的等级，最多20点额外伤害。'),
		80: new Feat(80,'高速代谢',()=>base.CON.value>=6,'所有治疗量提高25%，灵能增强剂额外恢复25点灵能。'),
		81: new Feat(81,'致命投掷',()=>base.DEX.value>=8&&skills.thr.value>=50,'飞刀对生命值低于25%的目标必定暴击。用飞刀杀死一个目标将返还18点动作点数（每回合只能发生一次）。'),
		82: new Feat(82,'守卫森严',()=>base.STR.value>=7&&skills.mel.value>=50,'你有35%的几率格挡相当于你力量两倍的近战机械伤害。如果处于眩晕或失能状态则无效。'),
		83: new Feat(83,'枪械迷',()=>base.INT.value>=7&&skills.mec.value>=15,'你制作的所有火器武器的伤害上限提高15%。'),
		84: new Feat(84,'重量级',()=>base.STR.value>=10&&skills.mel.value>=100,'你将护甲惩罚加到长柄锤、拳套武器和徒手攻击的暴击伤害加成上。'),
		85: new Feat(85,'泰坦',()=>base.CON.value>=7&&base.STR.value>=7,'当穿着（未经修改的）护甲惩罚为50%或更高的护甲套装时，总生命值提高25%。'),
		86: new Feat(86,'疯狂化学家',()=>base.INT.value>=7&&skills.che.value>=40,'你制作的化学手枪的命中效果翻倍。'),
		87: new Feat(87,'神经学',()=>base.INT.value>=7&&skills.bio.value>=35,'你制作的灵能头带还提供额外15点最大灵能点。'),
		88: new Feat(88,'定身',()=>base.DEX.value>=7&&skills.thr.value>=40,'你的飞刀有35%的几率将活体目标定身一回合。'),
		89: new Feat(89,'点射',()=>base.PER.value>=6&&base.DEX.value>=6&&skills.gun.value>=25,'授予你执行快速的手枪、冲锋枪或突击步枪攻击能力，消耗标准动作点数消耗的50%，但精准度降低。\n\n冷却时间：1回合。'),
		90: new Feat(90,'应用物理学家',()=>base.INT.value>=7&&skills.ele.value>=35,'你制作的能量武器的暴击伤害加成提高25%（加算）。'),
		91: new Feat(91,'快速开火',()=>skills.gun.value>=50,'授予你使用火器手枪、冲锋枪和突击步枪快速发射3发子弹的能力，精准度降低，消耗普通攻击150%的动作点数。\n\n冷却时间：2回合。'),
		92: new Feat(92,'撕裂者',()=>base.DEX.value>=10&&base.WIL.value>=5&&(skills.mel.value>=50||skills.thr.value>=50),"匕首、剑(砍刀)和飞刀的暴击伤害，根据目标缺失生命值百分比，每1%增加1%。与常规暴击伤害加成相乘计算。"),
		93: new Feat(93,'皮匠',()=>base.INT.value>=7&&skills.tai.value>=15,'在制作中，皮革的品质视为提高20%。'),
		94: new Feat(94,'分裂投掷',()=>base.DEX.value>=10&&skills.thr.value>=80,"投掷飞刀时，你会向攻击锥形范围内一个附近的额外目标投掷一把飞刀。"),
		95: new Feat(95,'坚忍',()=>base.CON.value>=7&&base.WIL.value>=7,'你每损失4%生命值，受到的所有来源伤害就减少1%。'),
		96: new Feat(96,'超级猛击',()=>base.STR.value>=10&&skills.mel.value>=75,"授予你一次特殊的长柄锤攻击，造成正常伤害，外加攻击者最大生命值的20%的额外机械伤害。\n\n冷却时间：3回合。"),
		97: new Feat(97,'稳健步伐',()=>base.AGI.value>=5,'你可以安全地通过铁蒺藜和酸液坑。'),
		98: new Feat(98,'生存本能',()=>base.CON.value>=9,'当生命值低于30%时，你的武器、徒手攻击和灵能能力的暴击几率提高30%。'),
		99: new Feat(99,'厚实头骨',()=>base.CON.value>=10,"每当你要被眩晕时，改为迷乱，这会减少你15点动作点数和30点移动点数，但仍允许你行动。"),
		100: new Feat(100,'冥想',()=>base.WIL.value>=7&&base.INT.value>=5&&anyPsiSkill(50)&&feats[63].owned,'最大灵能点增加25点。'),
		101: new Feat(101,'灵能狂热',()=>base.WIL.value>=8&&anyPsiSkill(50)&&feats[44].owned,'授予你一种能力，激活后使你的下一个攻击性灵能能力必定暴击。激活此能力还会移除最多15%的最大生命值，但不会杀死你。\n\n冷却时间：5回合。'),
		102: new Feat(102,'神经过载',()=>base.WIL.value>=10&&anyPsiSkill(65)&&feats[43].owned,'所有灵能能力的暴击伤害加成提高30%。'),
		103: new Feat(103,'灵能静电',()=>skills.psy.value>=40&&feats[43].owned,'当你使用电击灵能对目标造成伤害时，施加一个减益效果，在2回合内增加目标受到任何来源暴击的几率5%。最多叠加5层。'),
		104: new Feat(104,'念力波动',()=>base.WIL.value>=5&&skills.psy.value>=55&&feats[43].owned,"当你通过移动念力代理对一个活体目标造成伤害时，有50%的几率使其迷乱1回合。"),
		105: new Feat(105,'肉体投射',()=>base.STR.value>=6&&feats[43].owned,'所有念力伤害，每点力量超过5点，就提高5%。'),
		106: new Feat(106,'元素箭矢',()=>skills.cro.value>=75,'所有特殊弩箭的电击、酸液和热能伤害提高100%。'),
		107: new Feat(107,'震荡射击',()=>skills.cro.value>=30,'当你用弩箭造成机械伤害时，有40%的几率使活体目标迷乱，在1回合内减少其15点动作点数和30点移动点数。'),
		108: new Feat(108,'回想独白',()=>"special",'减缓不可言说之物渗透你心智的速率。'),
		109: new Feat(109,'渔夫',()=>"special",'你钓鱼从不失手。'),
		128: new Feat(128,'制弩匠',()=>base.INT.value>=7&&skills.mec.value>=30,'你制作的弩的暴击伤害加成提高35%（加算）。'),
		145: new Feat(145,'烹调射击',()=>base.DEX.value>=5&&skills.gun.value>=35&&skills.che.value>=25,'使你获得使用化学手枪的特殊攻击，向目标位置发射一个化学粘液球，对小范围内的所有目标造成正常武器伤害。此攻击消耗150%常规攻击动作点数。\n\n冷却时间：2回合。'),
		154: new Feat(154,'高技术力',()=>base.INT.value>=5&&skills.gun.value>=25||skills.mel.value>=25,'智力超过5的每一点，能量武器和配件（那些造成电击和能量伤害的）造成的伤害提高8%。'),
		163: new Feat(163,'多才多艺',()=>base.INT.value>=5,'你的有效枪械、重型枪械、弩和近战技能值被提升至最高技能有效值的60%。'),
		168: new Feat(168,'强化徒手格斗',()=>skills.mel.value>=35,'徒手伤害提高20%，并使你的徒手攻击有5%的几率使目标迷乱1回合。'),
		188: new Feat(188,'灵能神经优化',()=>base.WIL.value>=8&&anyPsiSkill(55)&&feats[43].owned&&!feats[189].owned,'当仅有一个灵能学派被激活(内化)时，所有灵能能力的灵能消耗降低10%。'),
		189: new Feat(189,'灵能神经适应',()=>base.INT.value>=8&&anyPsiSkill(55)&&feats[43].owned&&!feats[188].owned,'在计算激活(内化)多学派的灵能消耗惩罚时，忽略一个灵能学派。'),
		190: new Feat(190,'灵能容量扩充',()=>base.INT.value>=5&&anyPsiSkill(25)&&feats[43].owned,'灵能储备提高30%，灵能恢复速度提高相当于最大灵能储备1%的数值。'),
		191: new Feat(191,'强力精神支配',()=>"special",'你以粗粝的方式为灵能力量训练了你的心智，这在你身上留下了印记。你使用意志基础能力而非智力来决定灵能槽数量，但你的最大灵能点减少10点。\n\n你获得了可能逆转此效果的稀有金色药丸，但你不确定是否应该使用它。'),
		209: new Feat(209,'枪斗术',()=>skills.gun.value>=40&&skills.mel.value>=40,'在近战范围内使用火器手枪攻击时，你的有效攻击技能获得40%的原始近战技能加值，这也会影响伤害计算。'),
		210: new Feat(210,'子弹时间',()=>base.DEX.value>=9&&skills.gun.value>=70&&feats[23].owned,'激活后，在本回合结束前，使用火器手枪开火的动作点数消耗降低30%。\n\n不能将动作点数消耗降低到硬性最低值以下。\n\n冷却时间：10回合。'),
		211: new Feat(211,'远程医生',()=>base.DEX.value>=8&&skills.thr.value>=60&&skills.bio.value>=25,'飞刀计算防御后最终伤害提高50%。'),
		212: new Feat(212,'弹性念力',()=>base.WIL.value>=7&&skills.psy.value>=80&&feats[43].owned,'你的念力灵能能力的范围增加一，并且你产生的念力链的链接数也增加一。'),
		230: new Feat(230,'闷棍',()=>skills.mel.value>=50&&skills.ste.value>=50,'使用撬棍攻击时提供20%伤害加成，并允许你从目标背后发动一次特殊的撬棍攻击，该攻击无视所有抗性和护盾，并使目标丧失行动能力，持续最多5回合。\n\n你必须通过潜行对目标保持隐藏，或者目标需要处于丧失行动能力状态。仅对人形生物有效。\n\n冷却时间：6回合。'),
		231: new Feat(231,'博学者',()=>base.INT.value>=8,'立即获得15个技能点，并在之后的每一级额外获得5个技能点。'),
		217: new Feat(217,'超越寒冷',()=>"special","你体验过那种超越极度寒冷、处于完全静止临界点的可怕感觉，在那里活生生的躯体被耗尽了所有能量。\n\n当你被寒冷侵袭或冻结时，你将获得一个增益效果，使你的意志提高1点，受到的所有寒冷伤害减少40%，所有机械伤害减少15%，并使你在3回合内免疫进一步的寒冷侵袭或冻结。此效果每10回合只能发生一次。"),
		218: new Feat(218,'飘啊飘~',()=>"special",'你滥用这种危险物质次数太多，现在你的大脑受到了损伤。\n\n你的智力减少1点，并且你偶尔会遭受更严重的急性影响。'),
		219: new Feat(219,'制鞋匠',()=>"special"&&skills.tai.value>=60,'制作皮靴时，皮革品质视为提高10%。'),
		220: new Feat(220,'微调',()=>"special","你开始能分辨声音的细微差别了。在一个主要由黑暗洞穴和地铁隧道构成的世界里，这可不是件小事。\n\n探查提高15%。"),
		// core veteran
		110: new Feat(110,'淬炼: 热',()=>lvl.value>=26&&base.CON.value>=12&&!featGroup(2,110),'受到的所有热能伤害减少30%'),
		111: new Feat(111,'淬炼: 冷',()=>lvl.value>=26&&base.CON.value>=12&&!featGroup(2,111),'受到的所有寒冷伤害减少30%'),
		112: new Feat(112,'淬炼: 酸',()=>lvl.value>=26&&base.CON.value>=12&&!featGroup(2,112),'受到的所有酸伤害减少30%'),
		113: new Feat(113,'淬炼: 电',()=>lvl.value>=26&&base.CON.value>=12&&!featGroup(2,113),'受到的所有电伤害减少30%'),
		114: new Feat(114,'高级灵能亲和',()=>lvl.value>=26&&anyPsiSkill(100)&&feats[43].owned,'基础生命值额外减少15%（与原惩罚加算），施放灵能能力的灵能消耗降低20%（乘算）。'),
		115: new Feat(115,'健美',()=>lvl.value>=26&&base.CON.value>=12,'生命值增加80点。'),
		116: new Feat(116,'专家闪避',()=>lvl.value>=26&&base.AGI.value>=12&&skills.dod.value>=120,"你闪避近战攻击的几率提高5%（加算）。"),
		117: new Feat(117,'专家躲闪',()=>lvl.value>=26&&base.AGI.value>=12&&skills.eva.value>=120,"你躲闪远程攻击的几率提高5%（加算）。"),
		118: new Feat(118,'专家投掷',()=>lvl.value>=26&&base.DEX.value>=10&&skills.thr.value>=100,'投掷精准度提高10%（加算）。'),
		119: new Feat(119,'连环杀手',()=>lvl.value>=26&&!feats[120].owned&&!feats[121].owned,'对人形生物造成的徒手和武器伤害提高10%。'),
		120: new Feat(120,'怪物杀手',()=>lvl.value>=26&&!feats[119].owned&&!feats[121].owned,'对非人形生物造成的徒手和武器伤害提高15%。'),
		121: new Feat(121,'报废者',()=>lvl.value>=26&&!feats[119].owned&&!feats[120].owned,'对机器造成的徒手和武器伤害提高15%。'),
		122: new Feat(122,'战斗反应',()=>lvl.value>=26&&base.WIL.value>=7&&!feats[123].owned,'当在回合开始时生命值低于最大值的25%时，你的动作点数增加10点。'),
		123: new Feat(123,'逃跑反应',()=>lvl.value>=26&&base.AGI.value>=7&&!feats[122].owned,'当在回合开始时生命值低于最大值的35%时，你的移动点数最多增加25点（取决于你的护甲惩罚）。'),
		124: new Feat(124,'自重训练',()=>lvl.value>=26&&base.STR.value>=10,'护甲惩罚减少10%。'),
		125: new Feat(125,'供应商',()=>lvl.value>=26&&skills.mer.value>=50,'每点交易技能增加2%商人在与你交易时使用的金钱数量。'),
		137: new Feat(137,'特技演员',()=>lvl.value>=26&&base.AGI.value>=12,'受到的范围效果攻击伤害减少20%（与常规躲闪加算）。'),
		138: new Feat(138,'咒语',()=>lvl.value>=26&&base.WIL.value>=8&&anyPsiSkill(100),'灵能恢复速度提高10点。'),
		164: new Feat(164,'细致入微',()=>lvl.value>=26&&base.PER.value>=11&&(skills.mel.value>=120||skills.gun.value>=120||skills.hea.value>=120||skills.cro.value>=120),'徒手和武器攻击的暴击几率提高7%。'),
		165: new Feat(165,'专家冲刺',()=>lvl.value>=26&&base.AGI.value>=13&&feats[57].owned,'"冲刺"现在还为你提供10点动作点数。'),
		166: new Feat(166,'大步流星',()=>lvl.value>=26&&base.AGI.value>=10,'非潜行时移动点数增加15点，脱离战斗时的非潜行移动速度提高15%。'),
		167: new Feat(167,'钢铁意志',()=>lvl.value>=26&&base.WIL.value>=7,'坚毅提高50%。'),
		169: new Feat(169,'专家徒手格斗',()=>lvl.value>=26&&skills.mel.value>=100&&feats[168].owned,'进一步增加徒手伤害20%，并使你的徒手攻击有5%的几率使有机目标眩晕1回合。'),
		177: new Feat(177,'敏捷增强',()=>lvl.value>=26&&!featGroup(0,177),'敏捷增加2点。此专长提高敏捷的基础值，并将计入其他专长需求。'),
		178: new Feat(178,'体质增强',()=>lvl.value>=26&&!featGroup(0,178),'体质增加2点。此专长提高体质的基础值，并将计入其他专长需求。'),
		179: new Feat(179,'灵巧增强',()=>lvl.value>=26&&!featGroup(0,179),'灵巧增加2点。此专长提高灵巧的基础值，并将计入其他专长需求。'),
		180: new Feat(180,'智力增强',()=>lvl.value>=26&&!featGroup(0,180),'智力增加2点。此专长提高智力的基础值，并将计入其他专长需求。'),
		181: new Feat(181,'感知增强',()=>lvl.value>=26&&!featGroup(0,181),'感知增加2点。此专长提高感知的基础值，并将计入其他专长需求。'),
		182: new Feat(182,'力量增强',()=>lvl.value>=26&&!featGroup(0,182),'力量增加2点。此专长提高力量的基础值，并将计入其他专长需求。'),
		183: new Feat(183,'意志增强',()=>lvl.value>=26&&!featGroup(0,183),'意志增加2点。此专长提高意志的基础值，并将计入其他专长需求。'),
		184: new Feat(184,'强效施放: 热力操纵',()=>lvl.value>=26&&skills.met.value>=100&&feats[43].owned&&!featGroup(1,184),'授予你"强效施放"能力，在回合结束前提高热力操纵技能35%，但之后会耗尽所有剩余的灵能点。\n\n冷却时间：10回合。'),
		185: new Feat(185,'强效施放: 念动力',()=>lvl.value>=26&&skills.psy.value>=100&&feats[43].owned&&!featGroup(1,185),'授予你"强效施放"能力，在回合结束前提高念动力技能35%，但之后会耗尽所有剩余的灵能点。\n\n冷却时间：10回合。'),
		186: new Feat(186,'强效施放: 时间操纵',()=>lvl.value>=26&&skills.tem.value>=100&&feats[43].owned&&!featGroup(1,186),'授予你"强效施放"能力，在回合结束前提高时间操纵技能35%，但之后会耗尽所有剩余的灵能点。\n\n冷却时间：10回合。'),
		187: new Feat(187,'强效施放: 精神控制',()=>lvl.value>=26&&skills.tho.value>=100&&feats[43].owned&&!featGroup(1,187),'授予你"强效施放"能力，在回合结束前提高精神控制技能35%，但之后会耗尽所有剩余的灵能点。\n\n冷却时间：10回合。'),
	};
	const xpblFeats = {
		126: new Feat(126,'大杀特杀',()=>skills.gun.value>=55&&feats[1].owned,'授予你一种能力，激活后将使你下一次狙击步枪攻击如果杀死目标，则返还100%的动作点数消耗。如果未使用，将在回合结束时失效。\n\n冷却时间：10回合。\n\n此外，用狙击步枪杀死一个目标将使"大杀特杀"和"瞄准射击"的冷却时间减少1回合。'),
		127: new Feat(127,'挪移',()=>base.DEX.value>=5&&base.AGI.value>=5,'移动射击惩罚减少15%。'),
		129: new Feat(129,'残暴',()=>skills.ind.value>=75&&skills.mel.value>=50,"当你用近战攻击杀死一个目标时，有15%的几率使附近的敌人恐惧1回合。"),
		130: new Feat(130,'盾臂',()=>base.STR.value>=8,'盾牌的格挡几率提高15%（加算），格挡量提高30%。'),
		131: new Feat(131,'先射为强',()=>base.DEX.value>=6,'先攻提高7点。'),
		132: new Feat(132,'血狂乱',()=>base.WIL.value>=9&&base.CON.value>=7&&anyPsiSkill(75)&&feats[43].owned,'授予你一种能力，激活后将使你的所有灵能能力直到回合结束前消耗生命值而非灵能点。\n\n冷却时间：5回合'),
		133: new Feat(133,'出其不意',()=>skills.ste.value>=80,'在潜行期间及脱离潜行后一回合内，徒手和武器攻击伤害提高15%。'),
		134: new Feat(134,'连续统波纹',()=>skills.tem.value>=30&&feats[43].owned,'当你的时间扭曲触发时，有25%的几率将其应用于附近的每个敌人。以这种方式产生的时间扭曲现在可能会触发进一步的时间扭曲。'),
		135: new Feat(135,'心理时间加速',()=>skills.tem.value>=45&&feats[43].owned,'所有心理时间效应的动作点数修正提高5点，持续时间增加1回合。'),
		136: new Feat(136,'未来向',()=>skills.tem.value>=60&&feats[43].owned,'将所有具有冷却时间的时间操纵灵能技能的冷却时间减少1回合，并将这些灵能能力的动作点数消耗增加5点，前提是它们释放需要花费动作点。'),
		139: new Feat(139,'斩首',()=>base.STR.value>=7&&skills.mel.value>=40,'授予你一次特殊的剑(砍刀)攻击，造成正常武器伤害的150%，如果造成超过目标剩余生命值50%的伤害（且目标头部暴露），则可以立即杀死一个活体目标。\n\n冷却时间：5回合。'),
		140: new Feat(140,'剑刃乱舞',()=>base.DEX.value>=6&&skills.mel.value>=30,'授予你一个特殊技能，能够使用剑(砍刀)连续发动3次攻击。每次攻击都会使后续"剑刃乱舞"减少4动作点数消耗（最多叠加5次），效果持续直到下回合结束。\n\n如果任何一次攻击未命中或未造成伤害，"剑刃乱舞"效果将被移除并进入3回合冷却时间，动作点消耗减少效果也将被移除。'),
		141: new Feat(141,'杀戮风暴',()=>skills.mel.value>=75,'你的剑(砍刀)攻击命中将在2回合内使后续剑(砍刀)攻击的伤害提高5%。最多叠加20层。如果剑(砍刀)攻击未命中或未造成伤害，此加成将被移除。'),
		142: new Feat(142,'还击',()=>base.DEX.value>=7&&skills.mel.value>=40&&xpblFeats[153].owned,'当你持剑(砍刀)格挡任何伤害时，你可以发动一次特殊的剑(砍刀)攻击，命中率提高，造成正常武器伤害，不消耗动作点数。'),
		143: new Feat(143,'枪管瞄准',()=>skills.gun.value>=50,'你的霰弹枪攻击对近距离（近战范围）目标造成的伤害提高20%。'),
		144: new Feat(144,'弹丸风暴',()=>skills.gun.value>=40,'你的霰弹枪攻击为你下一次霰弹枪射击提供额外3%暴击几率，每击中一个目标增加。'),
		146: new Feat(146,'抵御',()=>base.AGI.value>=5&&skills.mel.value>=30,'授予你一个技能，释放立即获得"长矛守御"的能力，可以格挡比正常情况多150%的伤害，消耗普通攻击60%的动作点数。\n\n冷却时间：2回合。'),
		147: new Feat(147,'长矛守御',()=>base.STR.value>=6&&base.DEX.value>=5&&skills.mel.value>=55,'"长矛守御"的格挡几率提高30%。'),
		148: new Feat(148,'穿刺',()=>base.STR.value>=7&&skills.mel.value>=40,'授予你一次特殊的长矛攻击，如果命中则必定暴击。\n\n冷却时间：3回合。'),
		149: new Feat(149,'投矛',()=>base.DEX.value>=5&&skills.mel.value>=20&&skills.thr.value>=20,'授予你向目标投掷长矛的能力，造成正常武器伤害的125%，外加每单位距离额外20%的伤害。此攻击的精准度取决于投掷技能。消耗25点动作点数。\n\n冷却时间：1回合。\n\n之后你通常能够在不消耗动作点数的情况下，从目标附近取回投掷的长矛。'),
		150: new Feat(150,'引导射击',()=>base.DEX.value>=5&&skills.gun.value>=35,"只要近战范围内没有敌人干扰你，你的霰弹枪攻击无视目标65%的躲闪。"),
		151: new Feat(151,'完美散射',()=>skills.gun.value>=65,'你发射的每个霰弹枪弹丸额外造成1到2点机械伤害。'),
		152: new Feat(152,'破碎混沌',()=>base.PER.value>=9&&skills.gun.value>=70,'你的霰弹枪攻击的暴击伤害加成提高250%，除以发射的弹丸数量。'),
		153: new Feat(153,'招架',()=>base.DEX.value>=6&&skills.mel.value>=30,'持剑(砍刀)或匕首时，角色有25%的几率，外加每点敏捷超过6点3%的几率，格挡一次近战攻击。格挡量等于当前武器的平均基础机械伤害（剑(砍刀)），或该值的两倍（匕首）。'),
		155: new Feat(155,'哲学',()=>"special"&&!xpblFeats[156].owned&&!xpblFeats[157].owned,'涉足哲学让你对生活有了新的看法。\n\n坚毅提高15点，最大灵能点增加5点。'),
		156: new Feat(156,'哲学II',()=>"special"&&!xpblFeats[157].owned,'你可能不是训练有素的哲学家，但你对基本原理有很好的把握。\n\n坚毅提高30点，最大灵能点增加10点。'),
		157: new Feat(157,'哲学III',()=>"special",'你开始拼凑起这些碎片......也许这些悲惨的存在背后，确实有些意义。\n\n坚毅提高45点，最大灵能点增加15点。'),
		158: new Feat(158,'海战',()=>"special",'驾驶摩托艇时，有效稳定性提高15%，机动性提高10%。下船的动作点数消耗减少10点。同时提高不精通枪支者的摩托艇车载武器精准度。'),
		159: new Feat(159,'高级海战',()=>"special"&&base.AGI.value>=7&&xpblFeats[158].owned,'驾驶摩托艇时，进一步增加有效稳定性15%，机动性10%。进一步减少下船的动作点数消耗10点。同时提高不精通枪支者的摩托艇车载武器精准度。'),
		160: new Feat(160,'艇上突刺',()=>"special"&&skills.mel.value>=50,'移除驾驶摩托艇时使用匕首、拳套武器和徒手攻击时额外的10%精准度惩罚。'),
		161: new Feat(161,'海上对决',()=>"special"&&skills.mel.value>=70&&xpblFeats[158].owned,'驾驶摩托艇时长矛伤害提高30%。'),
		162: new Feat(162,'浪里白条',()=>lvl.value>=26&&base.AGI.value>=10&&xpblFeats[159].owned,'驾驶摩托艇攻击时，徒手和武器伤害提高30%，有效稳定性和机动性提高10%。'),
		170: new Feat(170,'盾击',()=>base.STR.value>=6&&skills.mel.value>=40,'授予你一种近战攻击，造成相当于所持防暴盾牌格挡量75%至125%的机械伤害，并使目标迷乱1回合。\n\n冷却时间：2回合。'),
		171: new Feat(171,'密不透风',()=>skills.mel.value>=60,'穿着防暴盾牌时命中一次近战攻击，将在3回合内使防暴盾牌的格挡量提高20%。最多叠加5层。'),
		172: new Feat(172,'横扫',()=>base.AGI.value>=6&&skills.mel.value>=55,'授予你一次特殊的长矛攻击，对你周围所有相邻的敌人造成正常武器伤害的70%，如果命中活体目标则使其失去平衡，持续2回合。\n\n失去平衡的角色闪避和躲闪降至零。\n\n冷却时间：3回合。'),
		173: new Feat(173,'肉体恐怖',()=>"special","目睹那一切之后，你再也不会以同样的眼光看待血肉之躯了。\n\n对人形生物和非昆虫类生物的武器和徒手攻击暴击几率提高3%。坚毅降低30%。"),
		174: new Feat(174,'外域异象',()=>"special","你看到了外域奇妙的可能性，无论是美丽的还是可憎的，你现在不那么倾向于相信这个特定物理世界界限的必要性。\n\n所有灵能能力的范围增加1。"),
		175: new Feat(175,'铁掌抓握',()=>base.STR.value>=11,'允许你在穿着带防暴盾牌的护甲时单手使用长矛，但武器伤害受到15%的惩罚。'),
		176: new Feat(176,'第六发',()=>skills.gun.value>=20,'每次霰弹枪射击将为霰弹枪攻击提供10%的伤害加成。当叠加到5层时，此伤害加成将变为100%，并且在第六次攻击后加成将重置。'),
		232: new Feat(232,'专家',()=>lvl.value>=16&&base.INT.value>=10,'每级额外获得一个专精点。'),
		207: new Feat(207,'怪物怒吼',()=>"special",'你的"怒吼"发出如此令人不安的声音，以至于还有30%的几率使目标恐惧1回合。'),
		208: new Feat(208,'粘性粘液腺',()=>"special",'允许你吐出酸性球体，伤害并缠绕你的目标。'),
		// tattoos
		192: new Feat(192,'纹身：保护国',()=>"special"&&!featGroup(3,192),'稍息，下士。\n生命值提高15。'),
		193: new Feat(193,'纹身：JKK',()=>"special"&&!featGroup(3,193),'你是一个机智的特工。\n\n说服技能提高15点。'),
		194: new Feat(194,'纹身：无政府状态',()=>"special"&&!featGroup(3,194),'你不向任何权威低头。\n\n武器和徒手攻击的暴击几率提高1%。'),
		195: new Feat(195,'纹身：核心科技',()=>"special"&&!featGroup(3,195),'最先进的装备造就最先进的特工。\n\n机械学和电子学技能提高7点。'),
		196: new Feat(196,'纹身：禁卫安保',()=>"special"&&!featGroup(3,196),'力量铸就秩序。\n\n受到武器和徒手攻击暴击的几率降低2%。'),
		197: new Feat(197,'纹身：神盾公司',()=>"special"&&!featGroup(3,197),'你将去任何地方，只要那是前进的方向。\n\n所有攻击技能提高5点。'),
		198: new Feat(198,"纹身：'玛格纳'虚空形态",()=>"special"&&!featGroup(3,198),'国王已死，国王万岁！\n\n闪避和躲闪提高10点。'),
		199: new Feat(199,'纹身：影石',()=>"special"&&!featGroup(3,199),'影石的恶意影响已被移除，但未能从你的皮肤上移除。\n\n灵能恢复速度提高2点。'),
		200: new Feat(200,'纹身：恶兽',()=>"special"&&!featGroup(3,200),'为人，就是要与怪物战斗。\n\n对非人形生物造成的徒手和武器伤害提高10%。'),
		201: new Feat(201,'纹身：超特',()=>"special"&&!featGroup(3,201),"无论它是怪物还是神，现在已经死了。\n\n坚毅提高10%，但侦测降低5%。"),
		202: new Feat(202,'纹身：超特学院',()=>"special"&&!featGroup(3,202),'超特即进化，进化即超特。\n\n生物和化学技能提高7点。'),
		203: new Feat(203,"纹身：巴洛尔之眼",()=>"special"&&!featGroup(3,203),"这只电眼唯一没看到的就是巴洛尔的惨死。\n\n探查提高10%。"),
		204: new Feat(204,'纹身：南门站',()=>"special"&&!featGroup(3,204),"没有哪个车站像家一样。\n\n所有技能提高2点。"),
		205: new Feat(205,'纹身：海盗',()=>"special"&&!featGroup(3,205),'有时候你只需要升起黑旗，开始割喉。\n\n驾驶喷气滑板时，所有攻击和防御技能提高10%。'),
		206: new Feat(206,'纹身：漂泊者',()=>"special"&&!featGroup(3,206),"你似乎无法在任何地方安定下来。每当你与一个派系或地方扯上关系，就有某种东西促使你继续前行。\n\n非潜行时移动速度提高2%，移动点数增加5点。"),
		213: new Feat(213,'纹身：噬艇者',()=>"special"&&!featGroup(3,213),'那恶臭液体的刺鼻气味一直伴随着你，你的皮肤因痛苦的记忆而刺痛。\n\n酸伤害防御阈值提高5点'),
		214: new Feat(214,'纹身：胖子',()=>"special"&&!featGroup(3,214),"吃饱喝足。尽情享用洞穴的馈赠，然后变胖。\n\n食物物品持续时间增加10分钟。"),
		215: new Feat(215,'纹身：漆黑之蝎',()=>"special"&&!featGroup(3,215),'如果你长时间凝视废土最黑暗的角落，你仍然能辨认出它巨大的红色眼睛。\n\n提高潜行基础值的15%。'),
		216: new Feat(216,'纹身：憎恶',()=>"special"&&!featGroup(3,216),'生命力----原始的、持久的、强大的----被扭曲成可怕的形态。\n\n将你自然恢复生命值的百分比阈值更改为70%。'),
	};
	const dlc2Feats = {
		221: new Feat(221,'暴力瞄准',()=>base.STR.value>=11&&skills.hea.value>=30,'你的感知在修正重武器技能时，视为提高3点。'),
		222: new Feat(222,'杀戮弹雨',()=>base.WIL.value>=5&&skills.hea.value>=50,'每次你用轻机枪或转轮机枪杀死一个敌人时，为轻机枪和转轮机枪攻击提供5%的伤害加成。持续2回合，最多叠加5层。'),
		223: new Feat(223,'重金属',()=>base.STR.value>=10&&skills.hea.value>=60,"根据当前武器的力量需求，每点减少1%受到的机械伤害，并且使用重武器攻击时，根据总护甲惩罚，获得50%的百分比伤害加成（火箭发射器为一半）。仅当两个武器槽都装备重武器或长柄锤且总护甲惩罚为50%或更高时有效。"),
		224: new Feat(224,"嗜血狂魔",()=>skills.hea.value>=70&&feats[80].owned,'每当你用机枪或转轮机枪攻击对敌人造成伤害时，你将获得一个效果，每回合为你恢复1点生命值，持续10回合，但不能治疗超过最大生命值的65%。最多叠加10层。'),
		225: new Feat(225,'清空弹匣',()=>base.STR.value>=8&&skills.hea.value>=80&&feats[21].owned,'进一步增加轻机枪连射的额外子弹数2发，并增加转轮机枪连射时每层预热效果获得的额外子弹数0.5发。'),
		226: new Feat(226,'诡谲弹道',()=>base.PER.value>=8&&(skills.gun.value>=90||skills.hea.value>=90),"范围效果武器的伤害提高10%，并忽视目标30%的躲闪率。对所有非投掷的范围效果武器有效，包括车载武器。"),
		227: new Feat(227,'抛物线',()=>base.PER.value>=7&&base.INT.value>=5&&skills.gun.value>=40,'榴弹发射器的精准度提高5%，榴弹最大偏移距离减少1。'),
		228: new Feat(228,'震荡弹',()=>skills.gun.value>=60||skills.hea.value>=60&&skills.ind.value>=40,"所有位于你的手榴弹或火箭发射器射弹爆炸半径内的人形生物，其攻击和防御技能减少4%，持续3回合。最多叠加5层。"),
		229: new Feat(229,'爆破手',()=>base.CON.value>=5&&skills.gun.value>=100||skills.hea.value>=100,'受到范围效果热能伤害后，将为你的手榴弹发射器攻击提供5%的伤害加成，持续3回合。最多叠加5层。'),
		233: new Feat(233,'负重猎鼠',()=>base.STR.value>=10,'负重增加150。'),
	};
	const specs = {
		10000: new Specialization(10000,10,'武器匠', 0.005, '每投入一点专精点数，暴击率进一步增加0.5%。'),
		10010: new Specialization(10010,10,'瞄准射击', 0.05, '每投入一点专精点数，使用瞄准射击时的暴击伤害加成进一步增加5%（与常规暴击伤害加成叠加）。'),
		10020: new Specialization(10020,10,'伏击', 0.02, '每投入一点专精点数，伏击提供的暴击率加成额外增加2%。'),
		10030: new Specialization(10030, 5,'碎骨者', 0.02, '每投入一点专精点数，每层断肋效果造成的额外伤害增加2%。'),
		10040: new Specialization(10040, 2,'窃贼：速度', 0.05, '每投入一点专精点数，开锁和黑客入侵的时间进一步降低5%。'),
		10041: new Specialization(10041, 3,'窃贼：潜行', 5, '每投入一点专精点数，潜行加成进一步增加5。'),
		10050: new Specialization(10050,10,'额叶损伤：伤害', 0.02, '每投入一点专精点数，神经过载的基础伤害进一步增加2%。'),
		10051: new Specialization(10051, 4,'额叶损伤：灵能削减', 0.05, '每投入一点专精点数，灵能值燃烧量额外增加5%。'),
		10060: new Specialization(10060, 5,'恶意中伤：失能几率', 0.01, '每投入一点专精点数，致使目标失能的几率额外增加1%。'),
		10061: new Specialization(10061,10,'恶意中伤：暴击伤害', 0.05, '每投入一点专精点数，暴击伤害加成进一步增加5%。'),
		10070: new Specialization(10070,10,'组合拳：伤害', 0.05, '每投入一点专精点数，额外伤害增加5%。'),
		10071: new Specialization(10071, 5,'组合拳：眩晕几率', 0.02, '每投入一点专精点数，眩晕目标的几率增加2%。'),
		10080: new Specialization(10080, 5,'身体调节', 0.01, '每投入一点专精点数，受到的伤害进一步降低1%。'),
		10090: new Specialization(10090,10,'致残打击', 0.05, '每投入一点专精点数，伤害修正值进一步增加5%。'),
		10100: new Specialization(10100, 4,'寒冰刺骨', 0.05, '每投入一点专精点数，破碎门槛降低5%。'),
		10110: new Specialization(10110,10,'割喉：伤害', 0.4, '每投入一点专精点数，攻击造成的额外流血伤害进一步增加40%。'),
		10111: new Specialization(10111, 3,'割喉：冷却', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		10120: new Specialization(10120, 5,'挡拆', 0.02, '每投入一点专精点数，源自近战技能的闪避加成进一步增加2%。'),
		10130: new Specialization(10130, 5,'撩阴腿', 0.1, '每投入一点专精点数，伤害增加10%。'),
		10140: new Specialization(10140,10,'医生', 0.02, '每投入一点专精点数，治疗加成进一步增加2%。'),
		10150: new Specialization(10150, 2,'机动躲闪', 0.5, '每投入一点专精点数，每一点移动点数额外给予你0.5点躲闪。'),
		10160: new Specialization(10160,10,'剔骨', 0.02, '每投入一点专精点数，每个流血伤口提供的额外伤害增加2%。'),
		10170: new Specialization(10170,10,'处决：伤害', 0.1, '每投入一点专精点数，伤害修正值进一步增加10%。'),
		10171: new Specialization(10171, 2,'处决：冷却', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		10180: new Specialization(10180, 1,'弱点暴露：持续时间', 1, '每投入一点专精点数，持续时间增加1回合。'),
		10181: new Specialization(10181, 5,'弱点暴露：抗性', 0.02, '每投入一点专精点数，机械抗性和门槛的降低量额外增加2%。'),
		10190: new Specialization(10190, 4,'花式步法', 0.5, '每投入一点专精点数，每次攻击能获得的最大移动点数增加0.5。'),
		10200: new Specialization(10200,10,'念力使者：伤害', 0.05, '每投入一点专精点数，念力拳伤害额外增加5%。'),
		10201: new Specialization(10201, 5,'念力使者：力场生命', 0.10, '每投入一点专精点数，念力场生命值加成增加10%。'),
		10210: new Specialization(10210, 5,'全自动：伤害', 0.03, '每投入一点专精点数，连射攻击的伤害增加3%。'),
		10211: new Specialization(10211, 5,'全自动：霰弹枪伤害', 0.03, '每投入一点专精点数，霰弹枪连射攻击的伤害增加3%。','xpbl'),
		10230: new Specialization(10230, 5,'枪手', 1, '每投入一点专精点数，先攻加成进一步增加1。'),
		10240: new Specialization(10240,5,'重拳：动作点', 0.1, '每投入一点专精点数，动作点消耗修正值降低10%。'),
		10241: new Specialization(10241,10,'重拳：暴击伤害', 0.03, '每投入一点专精点数，重拳的暴击伤害加成增加3%。'),
		10242: new Specialization(10242,10,'重拳：伤害', 0.1, '每投入一点专精点数，伤害增加10%。'),				
		10250: new Specialization(10250, 5,'游击战', 3, '每投入一点专精点数，移动点数重置上限增加3。角色仍需拥有足够的最大移动点数才能利用此提升的上限。'),
		10270: new Specialization(10270,10,'剧毒', 0.05, '每投入一点专精点数，毒素伤害进一步增加5%。'),
		10280: new Specialization(10280, 2,'低温症', 1, '每投入一点专精点数，低温症的最大堆叠层数增加1。'),
		10290: new Specialization(10290,10,'潜行者', 0, '每投入一点专精点数，进一步降低潜行时的移动速度惩罚1.5%，并允许你在潜行状态下进入战斗时保留最多2点移动点数。'),
		10300: new Specialization(10300, 5,'碎膝射击：伤害', 0, '每投入一点专精点数，流血伤害百分比增加20%。'),
		10301: new Specialization(10301, 4,'碎膝射击：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。'),
		10310: new Specialization(10310, 4,'背水一战：冷却', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		10311: new Specialization(10311, 4,'背水一战：持续时间', 0.5, '每投入一点专精点数，持续时间增加0.5回合。'),
		10320: new Specialization(10320, 5,'闪电拳', 0.01, '每投入一点专精点数，护甲惩罚门槛增加1%。'),
		10330: new Specialization(10330, 5,'控制心核：冷却', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		10331: new Specialization(10331, 2,'控制心核：持续时间', 0.5, '每投入一点专精点数，持续时间增加0.5回合。'),
		10340: new Specialization(10340, 5,'神箭手', 0.01, '每投入一点专精点数，弩的命中率增加1%。'),
		10360: new Specialization(10360, 5,'灵活', 0.02, '每投入一点专精点数，闪避和躲闪加成额外增加2%。'),
		10370: new Specialization(10370, 3,'扒窃大师：速度', 0.08, '每投入一点专精点数，偷窃时间进一步降低8%。'),
		10371: new Specialization(10371, 5,'扒窃大师：怀疑', 0.03, '每投入一点专精点数，引起的怀疑度进一步降低3%。'),
		10380: new Specialization(10380, 3,'机会主义者：受控目标', 0.03, '每投入一点专精点数，对被固定、眩晕和失能目标的伤害进一步增加3%。'),
		10381: new Specialization(10381, 3,'机会主义者：减速目标', 0.03, '每投入一点专精点数，对被减速目标的伤害进一步增加3%。'),
		10390: new Specialization(10390,10,'搬运鼠', 5, '每投入一点专精点数，负重能力进一步增加5。'),
		10400: new Specialization(10400, 5,'偏执狂：探查', 0.02, '每投入一点专精点数，探查能力进一步增加2%。'),
		10401: new Specialization(10401, 2,'偏执狂：暴击率降低', 0.005, '每投入一点专精点数，被暴击的几率进一步降低0.5%。'),
		10402: new Specialization(10402, 3,'偏执狂：伤害', 0.05, '每投入一点专精点数，对潜行目标的武器和徒手伤害进一步增加5%。'),
		10403: new Specialization(10403, 5,'偏执狂：先攻', 1, '每投入一点专精点数，先攻进一步增加1。'),
		10410: new Specialization(10410, 5,'能源管理', 0.02, '每投入一点专精点数，能量容量进一步增加2%。'),
		10420: new Specialization(10420, 4,'预谋：灵能消耗', 0.05, '每投入一点专精点数，灵能消耗进一步降低5%。'),
		10421: new Specialization(10421, 2,'预谋：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。'),
		10440: new Specialization(10440, 5,'精神错乱：灵能消耗', 0.01, '每投入一点专精点数，灵能点消耗修正值降低1%。'),
		10441: new Specialization(10441,10,'精神错乱：暴击率', 0.01, '每投入一点专精点数，暴击率加成进一步增加1%。'),
		10450: new Specialization(10450, 5,'痛打：伤害', 0.07, '每投入一点专精点数，伤害修正值增加7%。'),
		10451: new Specialization(10451, 5,'痛打：动作点', 2, '每投入一点专精点数，动作点消耗降低2。'),
		10460: new Specialization(10460,10,'纵火狂', 0.05, '每投入一点专精点数，燃烧伤害增加原始伤害的额外5%。'),
		10470: new Specialization(10470, 5,'快速口袋', 0.05, '每投入一点专精点数，动作点消耗进一步降低5%。'),
		10480: new Specialization(10480, 2,'快速布置：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。'),
		10481: new Specialization(10481, 5,'快速布置：动作点', 5, '每投入一点专精点数，快速布置陷阱时的动作点消耗降低5。'),
		10490: new Specialization(10490,10,'鲁莽', 0.01, '每投入一点专精点数，你使用所有武器的暴击率进一步增加1%，但你被暴击的几率也进一步增加1%。'),
		10500: new Specialization(10500,10,'推销员', 0.001, '每投入一点专精点数，每一级商业技能使商人愿意购买的商品数量进一步增加0.1%。'),
		10510: new Specialization(10510, 5,'神射手', 0.02, '每投入一点专精点数，暴击伤害加成进一步增加2%。'),
		10530: new Specialization(10530,10,'狙击', 0.001, '每投入一点专精点数，每一级潜行技能提供的额外伤害进一步增加0.1%。'),
		10540: new Specialization(10540, 2,'嗅探', 1, '每投入一点专精点数，用于探查秘密时的感知进一步增加1。'),
		10550: new Specialization(10550, 2,'特工', 0.5, '每投入一点专精点数，闪光弹及类似战术手雷的冷却时间进一步降低0.5回合。'),
		10560: new Specialization(10560, 2,'特殊战术', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		10570: new Specialization(10570, 5,'冲刺', 3, '每投入一点专精点数，冲刺提供的移动点数加成增加3。'),
		10580: new Specialization(10580, 5,'稳定瞄准', 0.0005, '每投入一点专精点数，每点动作点数提供的暴击率进一步增加0.05%。'),
		10590: new Specialization(10590, 5,'火力压制：命中率', 0.02, "每投入一点专精点数，目标远程命中率进一步降低2%。"),
		10591: new Specialization(10591, 5,'火力压制：动作点', 1, "每投入一点专精点数，目标动作点数进一步减少1。"),
		10592: new Specialization(10592, 5,'火力压制：移动点', 2, "每投入一点专精点数，目标移动点数进一步减少2。"),
		10600: new Specialization(10600, 5,'嗜血', 0.002, '每投入一点专精点数，每层堆叠提供的近战伤害加成进一步增加0.2%。'),
		10610: new Specialization(10610, 5,'热动平衡', 0.03, '每投入一点专精点数，动作点消耗进一步降低3%。'),
		10620: new Specialization(10620,10,'三分球', 0.001, '每投入一点专精点数，根据所述的技能点数量，暴击率进一步增加0.1%。'),
		10630: new Specialization(10630,10,'宁静', 0.2, '每投入一点专精点数，动作点消耗进一步降低0.2。'),
		10640: new Specialization(10640,10,'陷阱专家：速度', 0.03, '每投入一点专精点数，布置和拆除陷阱所需的时间进一步降低3%。'),
		10641: new Specialization(10641, 5,'陷阱专家：探查', 0.03, '每投入一点专精点数，你设置的陷阱的侦测难度进一步增加3%。'),
		10650: new Specialization(10650, 5,'直觉闪避', 1, '每投入一点专精点数，获得额外闪避所需的技能点数减少1。'),
		10660: new Specialization(10660, 5,'阴毒兵器：伤害', 0.01, '每投入一点专精点数，每层堆叠使目标受到的所有伤害进一步增加1%。'),
		10661: new Specialization(10661, 2,'阴毒兵器：治疗效果降低', 0.025, '每投入一点专精点数，每层堆叠使治疗效果进一步降低2.5%。'),
		10670: new Specialization(10670, 5,'摔跤', 0.1, '每投入一点专精点数，施加减益效果的几率增加10%。'),
		10680: new Specialization(10680, 3,'怒吼', 0.05, '每投入一点专精点数，技能降低百分比增加5%。'),
		10690: new Specialization(10690, 2,'护甲改装', 0.02, '每投入一点专精点数，护甲惩罚进一步降低2%。'),
		10700: new Specialization(10700, 3,'弹道学', 1, '每投入一点专精点数，机械门槛加成进一步增加1。'),
		10710: new Specialization(10710, 5,'闪电战：冷却', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		10711: new Specialization(10711, 3,'闪电战：最大动作点', 2, '每投入一点专精点数，可获得的最大动作点数增加2。'),
		10720: new Specialization(10720, 5,'制衣匠', 0.02, '每投入一点专精点数，有效品质进一步增加2%。'),
		10730: new Specialization(10730, 3,'突击队员', 3, '每投入一点专精点数，使用突击步枪或微冲进行连射攻击击杀敌人时，将获得3点动作点数。这也同样每回合只能触发一次。'),
		10740: new Specialization(10740,10,'集中火力', 0.02, '每投入一点专精点数，集中火力每层效果的伤害加成进一步增加2%。'),
		10750: new Specialization(10750,10,'强力暴击', 0.001, '每投入一点专精点数，暴击伤害增益进一步增加0.1%（按所述条件）。'),
		10760: new Specialization(10760,10,'致命诱捕', 0.03, '每投入一点专精点数，由其引发的暴击，其暴击伤害加成进一步增加3%。'),
		10770: new Specialization(10770, 5,'拆解', 0.02, '每投入一点专精点数，拆解组件保留原始品质的百分比增加2%。'),
		10780: new Specialization(10780, 3,'逃脱专家', 10, '每投入一点专精点数，成功挣脱束缚现在还将给予你10点移动点数。'),
		10790: new Specialization(10790, 5,'专业知识', 1, '每投入一点专精点数，最大伤害加成增加1。'),
		10800: new Specialization(10800,10,'高速代谢：治疗', 0.02, '每投入一点专精点数，所有治疗效果进一步增加2%。'),
		10801: new Specialization(10801,10,'高速代谢：灵能', 2, '每投入一点专精点数，灵能增强剂额外恢复2点灵能值。'),
		10810: new Specialization(10810, 5,'致命投掷：生命门槛', 0.02, '每投入一点专精点数，触发的生命值门槛提升2%。'),
		10811: new Specialization(10811, 3,'致命投掷：动作点', 3, '每投入一点专精点数，恢复的动作点数进一步增加3。'),
		10820: new Specialization(10820,10,'守卫森严：格挡几率', 0.01, '每投入一点专精点数，格挡几率增加1%。'),
		10821: new Specialization(10821, 5,'守卫森严：格挡值', 0.2, '每投入一点专精点数，力量每有一点，格挡值额外增加0.2。'),
		10830: new Specialization(10830,10,'枪械迷', 0.02, '每投入一点专精点数，伤害范围上限进一步增加2%。'),
		10840: new Specialization(10840, 5,'重量级', 0.1, '每投入一点专精点数，总护甲惩罚每有1%，提供额外0.1%暴击伤害加成。'),
		10850: new Specialization(10850,10,'泰坦', 0.02, '每投入一点专精点数，生命值加成进一步增加2%。'),
		10860: new Specialization(10860,10,'疯狂化学家', 0.07, '每投入一点专精点数，化学手枪的击中效果强度进一步增加7%。'),
		10870: new Specialization(10870,10,'神经学', 1, '每投入一点专精点数，最大灵能值进一步增加1。'),
		10880: new Specialization(10880,10,'定身', 0.01, '每投入一点专精点数，定身几率增加1%。'),
		10890: new Specialization(10890,10,'点射', 0.02, '每投入一点专精点数，动作点消耗额外降低2%。'),
		10900: new Specialization(10900,10,'应用物理学家', 0.02, '每投入一点专精点数，暴击伤害加成进一步增加2%。'),
		10910: new Specialization(10910, 3,'快速开火', 0.05, '每投入一点专精点数，动作点消耗修正值降低5%。'),
		10920: new Specialization(10920,10,'撕裂者', 0.001, '每投入一点专精点数，根据所述的已损失生命值百分比，暴击伤害加成修正值进一步增加0.1%。'),
		10930: new Specialization(10930, 5,'皮匠', 0.02, '每投入一点专精点数，有效品质进一步增加2%。'),
		10940: new Specialization(10940,10,'分裂投掷', 0.02, '每投入一点专精点数，当向两个目标投掷飞刀时，两把飞刀的伤害均增加2%。'),
		10950: new Specialization(10950, 5,'坚忍', 0.001, '每投入一点专精点数，根据所述的已损失生命值，伤害减免百分比额外增加0.1%。'),
		10960: new Specialization(10960, 5,'超级猛击', 0.02, '每投入一点专精点数，附加到伤害中的生命值量增加2%。'),
		10970: new Specialization(10970, 3,'稳健步伐', 0.2, '每投入一点专精点数，给予你20%的几率闪避任何捕兽夹。'),
		10980: new Specialization(10980, 5,'生存本能：生命门槛', 0.02, '每投入一点专精点数，生命值门槛增加2%。'),
		10981: new Specialization(10981,10,'生存本能：暴击率', 0.01, '每投入一点专精点数，暴击率进一步增加1%。'),
		10990: new Specialization(10990, 3,'厚实头骨', 15, '每投入一点专精点数，坚韧增加15。'),
		11000: new Specialization(11000,10,'冥想', 1, '每投入一点专精点数，最大灵能值进一步增加1。'),
		11010: new Specialization(11010, 5,'灵能狂热：生命消耗', 0.01, '每投入一点专精点数，生命值消耗降低1%。'),
		11011: new Specialization(11011, 2,'灵能狂热：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。'),
		11020: new Specialization(11020,10,'神经过载', 0.02, '每投入一点专精点数，所有灵能能力的暴击伤害加成进一步增加2%。'),
		11030: new Specialization(11030,10,'灵能静电：暴击率', 0.005, "每投入一点专精点数，每层堆叠使目标被暴击的几率进一步增加0.5%。"),
		11031: new Specialization(11031, 1,'灵能静电：持续时间', 1, '每投入一点专精点数，持续时间增加1回合。'),
		11040: new Specialization(11040, 5,'念力波动', 0.1, '每投入一点专精点数，致使目标迷乱的几率增加10%。'),
		11050: new Specialization(11050, 6,'肉体投射', 0.005, '每投入一点专精点数，力量每超过5一点，所有念力伤害进一步增加0.5%。'),
		11060: new Specialization(11060,10,'元素箭矢', 0.05, '每投入一点专精点数，伤害加成进一步增加5%。'),
		11070: new Specialization(11070, 5,'震荡射击', 0.04, '每投入一点专精点数，致使迷乱的几率进一步增加4%。'),
		11260: new Specialization(11260, 4, '大杀特杀：冷却', 1, '每投入一点专精点数，冷却时间降低1回合。'),
		11261: new Specialization(11261, 1, '大杀特杀：射击次数', 1, '返还的射击次数增加一次。'),
		11270: new Specialization(11270,10,'挪移', 0.01, '每投入一点专精点数，移动射击惩罚进一步降低1%。','xpbl'),
		11280: new Specialization(11280,10,'制弩匠', 0.02, '每投入一点专精点数，暴击伤害加成进一步增加2%。'),
		11290: new Specialization(11290,10,'残暴', 0.01, '每投入一点专精点数，施加恐惧的几率增加1%。','xpbl'),
		11300: new Specialization(11300, 5,'盾臂：格挡几率', 0.01, '每投入一点专精点数，格挡几率进一步增加1%。','xpbl'),
		11301: new Specialization(11301,10,'盾臂：格挡值', 0.02, '每投入一点专精点数，格挡值进一步增加2%。','xpbl'),
		11310: new Specialization(11310,10,'先射为强', 1, '每投入一点专精点数，先攻进一步增加1。','xpbl'),
		11320: new Specialization(11320, 5,'血狂乱：生命消耗', 0.05, '每投入一点专精点数，灵能能力的生命值消耗降低5%。','xpbl'),
		11321: new Specialization(11321, 4,'血狂乱：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。','xpbl'),
		11330: new Specialization(11330,10,'出其不意', 0.01, '每投入一点专精点数，伤害进一步增加1%。','xpbl'),
		11340: new Specialization(11340,10,'连续统波纹', 0.02, '每投入一点专精点数，重新施加的几率增加2%。','xpbl'),
		11350: new Specialization(11350, 4,'心理时间加速', 0.5, '每投入一点专精点数，动作点数修正量进一步增加0.5。','xpbl'),
		11360: new Specialization(11360, 5,'未来向', 1, '每投入一点专精点数，动作点数的增加量减少1。','xpbl'),
		11390: new Specialization(11390, 5,'斩首：伤害', 0.1, '每投入一点专精点数，伤害增加10%。','xpbl'),
		11391: new Specialization(11391, 5,'斩首：门槛', 0.03, '每投入一点专精点数，斩首门槛降低3%。','xpbl'),
		11400: new Specialization(11400, 5,'剑刃乱舞：动作点消耗', 1, '动作点消耗降低1。','xpbl'),
		11401: new Specialization(11401, 2,'剑刃乱舞：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。','xpbl'),
		11410: new Specialization(11410,10,'杀戮风暴', 0.005, '每投入一点专精点数，每层堆叠的伤害加成增加0.5%。','xpbl'),
		11420: new Specialization(11420,10,'还击', 0.03, '每投入一点专精点数，还击的暴击率增加3%。','xpbl'),
		11430: new Specialization(11430,10,'枪管瞄准', 0.02, '每投入一点专精点数，伤害加成进一步增加2%（叠加）。','xpbl'),
		11440: new Specialization(11440, 4,'弹丸风暴', 0.005, '每投入一点专精点数，每个目标的暴击率加成增加0.5%。','xpbl'),
		11450: new Specialization(11450,10,'烹调射击：伤害', 0.05, '每投入一点专精点数，烹调射击的伤害增加5%。'),
		11451: new Specialization(11451, 5,'烹调射击：动作点消耗', 0.1, '每投入一点专精点数，烹调射击的动作点消耗修正值降低10%。'),
		11460: new Specialization(11460,10,'抵御：格挡值', 0.1, '每投入一点专精点数，额外格挡的伤害量增加10%。','xpbl'),
		11461: new Specialization(11461, 5,'抵御：动作点消耗', 0.1, '每投入一点专精点数，动作点消耗降低8%。','xpbl'),
		11470: new Specialization(11470, 2,'长矛守御', 0.1, '每投入一点专精点数，格挡几率加成增加10%。','xpbl'),
		11480: new Specialization(11480,10,'穿刺', 0.05, '每投入一点专精点数，穿刺的暴击伤害加成进一步增加5%（与常规暴击伤害加成叠加）。','xpbl'),
		11490: new Specialization(11490, 3,'投矛：动作点消耗', 3, '每投入一点专精点数，动作点消耗降低3。','xpbl'),
		11491: new Specialization(11491,10,'投矛：伤害', 0.01, '每投入一点专精点数，每单位距离的伤害倍率额外增加1%。','xpbl'),
		11492: new Specialization(11492, 3,'投矛：射程', 1, '每投入一点专精点数，射程增加1。','xpbl'),
		11500: new Specialization(11500, 5,'引导射击', 0.05, '每投入一点专精点数，无视躲闪的数值叠加增加额外5%。','xpbl'),
		11510: new Specialization(11510, 2,'完美散射', 0.5, '每投入一点专精点数，最大伤害加成增加0.5。','xpbl'),
		11520: new Specialization(11520,10,'破碎混沌', 0.1, '每投入一点专精点数，总暴击伤害加成增加10%。','xpbl'),
		11530: new Specialization(11530, 5,'招架：几率', 0.02, '每投入一点专精点数，格挡几率增加2%。','xpbl'),
		11531: new Specialization(11531,10,'招架：格挡值', 0.05, '每投入一点专精点数，格挡量增加5%。','xpbl'),
		11540: new Specialization(11540, 5,'高技术力', 0.004, '每投入一点专精点数，智力每超过5一点，额外伤害进一步增加0.4%。'),
		11630: new Specialization(11630,10,'多才多艺', 0.02, '每投入一点专精点数，使用的技能值百分比进一步增加2%。'),
		11680: new Specialization(11680, 5,'强化徒手格斗：伤害', 0.02, '每投入一点专精点数，伤害加成增加2%。'),
		11681: new Specialization(11681, 3,'强化徒手格斗：迷乱几率', 0.01, '每投入一点专精点数，致使目标迷乱的几率增加1%。'),
		11700: new Specialization(11700,10,'盾击：伤害', 0.1, '每投入一点专精点数，伤害百分比增加10%。','xpbl'),
		11701: new Specialization(11701, 2,'盾击：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。','xpbl'),
		11702: new Specialization(11702, 3,'盾击：动作点消耗', 5, '每投入一点专精点数，动作点消耗降低5。','xpbl'),
		11710: new Specialization(11710,10,'密不透风', 0.02 ,'每投入一点专精点数，每层堆叠的格挡量额外增加2%。','xpbl'),
		11720: new Specialization(11720, 5,'横扫：伤害', 0.04 ,'每投入一点专精点数，伤害修正值增加4%。','xpbl'),
		11721: new Specialization(11721, 2,'横扫：冷却', 0.5, '每投入一点专精点数，冷却时间降低0.5回合。','xpbl'),
		11722: new Specialization(11722, 2,'横扫：持续时间', 0.5, '每投入一点专精点数，失衡效果的持续时间增加0.5回合。','xpbl'),
		11750: new Specialization(11750, 5,'铁掌抓握', 0.01, '每投入一点专精点数，伤害惩罚降低1%。','xpbl'),
		11760: new Specialization(11760, 5,'第六发', 0.2, '每投入一点专精点数，每层堆叠的递增伤害加成增加2%，最终伤害加成增加20%。','xpbl'),
		11880: new Specialization(11880, 5,'灵能神经优化', 0.01, '每投入一点专精点数，灵能消耗进一步降低1%。'),
		11900: new Specialization(11900, 2,'灵能容量扩充', 0.10, '每投入一点专精点数，灵能储备加成进一步增加10%。'),
		12090: new Specialization(12090, 4,'枪斗术', 0.05, '每投入一点专精点数，使用的技能值百分比进一步增加5%。'),
		12100: new Specialization(12100, 5,'子弹时间', 0.04, '每投入一点专精点数，动作点消耗进一步降低4%（叠加）。'),
		12110: new Specialization(12110, 5,'远程医生', 0.10, '每投入一点专精点数，无视抗性的伤害修正值进一步增加10%（叠加）。'),

		12220: new Specialization(12220,  5,'杀戮弹雨：伤害', 0.01, '每投入一点专精点数，伤害加成增加1%。','dlc2'),
		12221: new Specialization(12221,  2,'杀戮弹雨：持续时间', 0.5, '每投入一点专精点数，持续时间增加0.5回合。','dlc2'),
		12222: new Specialization(12222,  5,'杀戮弹雨：最大层数', 1, '每投入一点专精点数，堆叠层数增加一。','dlc2'),
		12230: new Specialization(12230,  5,'重金属：伤害加成', 0.05, '每投入一点专精点数，转化为伤害加成的护甲惩罚量进一步增加5%。','dlc2'),
		12231: new Specialization(12231,  5,'重金属：伤害减免', 0.001, "每投入一点专精点数，武器的力量要求每有一点，受到的机械伤害进一步降低0.1%。",'dlc2'),
		12240: new Specialization(12240, 10,"嗜血狂魔：持续时间", 1, '每投入一点专精点数，持续时间增加一回合。','dlc2'),
		12241: new Specialization(12241, 10,"嗜血狂魔：最大层数", 1, '每投入一点专精点数，最大堆叠层数增加一。','dlc2'),
		12242: new Specialization(12242,  5,"嗜血狂魔：门槛", 0.03, '每投入一点专精点数，生命值门槛提升3%。','dlc2'),
		12250: new Specialization(12250,  2,'清空弹匣：轻机枪连射', 0.5, '每投入一点专精点数，轻机枪的额外连射轮数进一步增加0.5。','dlc2'),
		12251: new Specialization(12251,  5,'清空弹匣：转轮机枪连射', 0.1, '每投入一点专精点数，使用转轮机枪连射攻击时，每层连射蓄能效果获得的额外子弹数进一步增加0.1。','dlc2'),
		12260: new Specialization(12260,  5,'诡谲弹道：伤害加成', 0.02, '每投入一点专精点数，伤害加成增加2%。','dlc2'),
		12261: new Specialization(12261, 10,'诡谲弹道：躲闪', 0.02, '每投入一点专精点数，无视躲闪的数值增加2%。','dlc2'),
		12270: new Specialization(12270,  5,'抛物线', 0.01, '每投入一点专精点数，精准度加成增加1%。','dlc2'),
		12280: new Specialization(12280,  5,'震荡弹：持续时间', 1, '每投入一点专精点数，持续时间增加一回合。','dlc2'),
		12281: new Specialization(12281,  3,'震荡弹：最大层数', 1, '每投入一点专精点数，最大堆叠层数增加一。','dlc2'),
		12282: new Specialization(12282,  4,'震荡弹：技能降低', 0.005, '每投入一点专精点数，每层堆叠的技能降低值增加0.5%。','dlc2'),
		12290: new Specialization(12290,  5,'爆破手：伤害加成', 0.01, '每投入一点专精点数，伤害加成增加1%。','dlc2'),
		12291: new Specialization(12291,  4,'爆破手：持续时间', 0.5, '每投入一点专精点数，持续时间增加0.5回合。','dlc2'),
		12292: new Specialization(12292,  3,'爆破手：最大层数', 1, '每投入一点专精点数，堆叠层数增加一。','dlc2'),
		12330: new Specialization(12330,  5,'负重猎鼠', 15, '每投入一点专精点数，负重能力进一步增加15。','dlc2'),
	};
	const derived = {
		health: new DerivedStat('hp', function(){
			let hpMod = 1;
			hpMod -= feats[ 43].owned? 0.20 : 0; // Psi Empathy
			hpMod -= feats[114].owned? 0.15 : 0; // Advanced Psi Empathy

			let hp = 30 + base.CON.effVal*4 + lvl.value*(4 + base.CON.effVal*1.2);
			hp *= (this.difficultyMod || 1.5); // easy 3, normal 1.5, hard 1
			hp *= hpMod;
			hp *= feats[ 85].owned? 1.25 + specs[10850].effect : 1; // Juggernaut
			hp += this.bonus;
			hp += feats[115].owned? 80 : 0; // Bodybuilding
			hp += xpblFeats[192].owned? 15 : 0; // Tattoo: Protectorate

			return Math.max(1, hp|0);
		}),
		psiPool: new DerivedStat('psip', function(){
			let n = 100 + this.bonus;
			n +=     feats[ 87].owned? 15 + specs[10870].effect : 0; // Neurology
			n +=     feats[100].owned? 25 + specs[11000].effect : 0; // Meditation
			n += xpblFeats[157].owned? 15 : xpblFeats[156].owned? 10 : xpblFeats[155].owned? 5 : 0; // philosofeats
			n -=     feats[191].owned? 10 : 0; // Forceful Innervation

			return feats[43].owned? n|0 : 'N/A'; // Psi Empathy
		}),
		psiRegen: new DerivedStat('psir', function(){
			let n = 5 + (base.WIL.effVal + base.INT.effVal)/2 + this.bonus;
			n +=     feats[138].owned? 5 : 0; // Mantra
			n += xpblFeats[199].owned? 2 : 0; // Tattoo: Shadowlith

			return feats[43].owned? n|0 : 'N/A'; // Psi Empathy
		}),
		psiReserve: new DerivedStat('psi5', function(){
			let n = 5*derived.psiPool.value;
			n *= feats[190].owned? 1.30 + specs[11900].effect : 1; // Expanded Psi Capacitance

			return feats[43].owned? n|0 : 'N/A'; // Psi Empathy
		}),
		psiSlots: new DerivedStat('psis', function(){
			const slotstat = feats[191].owned? base.WIL.value : base.INT.value; // Forceful Innervation

			return feats[43].owned? Math.min(2 + slotstat/2 |0, 8) : 'N/A'; // Psi Empathy
		}),
		movement: new DerivedStat('mp', function(){
			let n = Math.max(15 + 3*base.AGI.effVal, 30) + this.bonus;
			n +=     feats[166].owned? 15 : 0; // Strider
			n += xpblFeats[206].owned? 5 : 0; // Tattoo: Drifter

			return n|0;
		}),
		initiative: new DerivedStat('ini', function(){
			let n = 5 + base.DEX.effVal + base.AGI.effVal + this.bonus;
			n +=     feats[ 40].owned? 5 + specs[10403].effect : 0; // Paranoia
			n +=     feats[ 23].owned? 7 + specs[10230].effect : 0; // Gunslinger
			n += xpblFeats[131].owned? 7 + specs[11310].effect : 0; // Trigger Happy

			return n|0;
		}),
		fortitude: new DerivedStat('fort', function(){
			let n = (8 + 4*lvl.value) * baseAbilityMod(0.6*base.CON.effVal + 0.2*base.STR.effVal + 0.2*base.WIL.effVal |0) + this.bonus;
			n += specs[10990].effect; // Thick Skull

			return n|0;
		}),
		resolve: new DerivedStat('res', function(){
			let mod = this.multiplier;
			mod +=     feats[167].owned? 0.5 : 0; // Iron Will
			mod += xpblFeats[173].owned? -0.3 : 0; // Body Dorror
			mod += xpblFeats[201].owned? 0.1 : 0; // Tattoo: Tchort

			let n = (8 + 4*lvl.value) * baseAbilityMod(base.WIL.effVal) * mod + this.bonus;
			n += xpblFeats[155].owned? 15 : xpblFeats[156].owned? 30 : xpblFeats[157].owned? 45 : 0; // philosofeats

			return n|0;
		}),
		detection: new DerivedStat('det', function(){
			let mod = this.multiplier;
			mod +=     feats[ 40].owned? 0.2 + specs[10400].effect : 0; // Paranoia
			mod += xpblFeats[201].owned? -0.05 : 0; // Tattoo: Tchort
			mod += xpblFeats[203].owned? 0.1 : 0; // Tattoo: Balor's Eye
			mod +=     feats[220].owned? 0.15 : 0; // Fine Tuned

			let n = (10 + 5*lvl.value) * baseAbilityMod(base.PER.effVal) * mod;

			return n|0;
		}),
		trapDetection: new DerivedStat('trd', function(){
			return Math.max(
				0.75*derived.detection.value |0,
				0.50*derived.detection.value + 0.75*skills.tra.effVal |0
			);
		}),
		carryWeight: new DerivedStat('cw', function(){
			let n = 100 + 10*base.STR.effVal + this.bonus;
			n += feats[39].owned? 50 + specs[10390].effect : 0; // Pack Rathound
			n += dlc2Feats[233].owned? 150 + specs[12330].effect : 0; // Beast of Burden
			
			return n|0;
		}),
	};
	const items = {
		head: {
			equipped: new Item(),
			none: new Item(),
			gasMask:   new Item({}, [base.PER, -2], [n => derived.detection.multiplier += n, -0.50]),
			metalHelm: new Item({}, [base.PER, -1], [n => derived.detection.multiplier += n, -0.30]),
			adGoggles: new Item({}, [base.PER, 1]),
			balaclava: new Item({}, [skills.ind, 5]),
			deathgrin: new Item({}, [skills.ind, 30], [skills.ste, -30]),
			pacifier:  new Item({}, [psiSkillsArray, 15], [derived.psiRegen, -2]),
		},
		suit: {
			equipped: new Item(),
			none: new Item(),
			pigLeather:      new Item({}, [base.CON, 1]),
			hopperLeather:   new Item({}, [base.AGI, 1]),
			mutantLeather:   new Item({}, [skills.ind,  5]),
			leperSerpent:    new Item({}, [skills.per,-30]),
			heartbreaker:    new Item({}, [skills.per, 10], [skills.dod, 20], [skills.ste, -35], [skills.eva, -30]),
			rathoundRegalia: new Item({}, [base.STR, 1],    [skills.ste, 25], [derived.movement, 10]),
			tchNobleRobe:    new Item({}, [base.WIL, 1],    [skills.tho, 25], [n => derived.resolve.multiplier += n, 0.15], [base.PER, -1]),
			tchortistRobe:   new Item({}, [base.PER,-2],    [skills.ste, 20], [skills.ind, 20]),
			LemEngSuit:      new Item({reqs: [[base.INT, 5]]}, [skills.tra, 20], [skills.hac, 10], [skills.loc, 10], [skills.mec, 10], [skills.ele, 10]),
			CAUarmor:        new Item({}, [skills.ind, 10]),
			grayOfficer:     new Item({}, [skills.ind, 15]),
			aegisSuit:       new Item({}, [derived.fortitude, 20]),
			blastSuit:       new Item({}, [base.DEX, -6], [base.AGI, -6]),
			jkkVest:         new Item({}, [skills.per, 15], [skills.loc, 10], [derived.initiative, 5]),
			praetorHeavy:    new Item({}, [skills.per, 10], [skills.ind, 10]),
			praetorMed:      new Item({}, [skills.per,  5], [skills.ind,  5]),
			tchVathosphore:  new Item({}, [base.PER, -1], [derived.health, 30], [derived.fortitude, 40], [n => derived.resolve.multiplier += n, 0.20]),
		},
		feet: {
			equipped: new Item(),
			none: new Item(),
			pigLeather:    new Item({}, [base.CON, 1]),
			hopperLeather: new Item({}, [base.AGI, 1]),
			mutantLeather: new Item({}, [skills.ind, 5]),
			leperSerpent:  new Item({}, [skills.per,-30]),
			heartbreaker:  new Item({}, [skills.per, 10], [skills.ste, -35]),
			luperchaun:    new Item({}, [base.AGI, 2], [skills.mer, 20], [skills.per, 20], [derived.movement, 10]),
		},
		belt: {
			equipped: new Item(),
			none: new Item(),
			vigor:    new Item({}, [derived.health, 30], [base.AGI, -2]),
			trapper:  new Item({}, [n => skills.tra.multiplier += n, 15]),
			bullet:   new Item({}, [skills.ind, 5]),
			shell:    new Item({}, [skills.ind, 5]),
			suicide:  new Item({}, [base.AGI, -1], [skills.ind, 20], [skills.per, -30], [derived.movement, -10]),
			commando: new Item({}, [skills.thr, 15]),
			tchBio:   new Item({reqs: [[skills.bio, 50]]}, [base.AGI, -1], [skills.bio, 15]),
			tchChem:  new Item({reqs: [[skills.che, 50]]}, [base.AGI, -1], [skills.che, 15]),
			tchElec:  new Item({reqs: [[skills.ele, 50]]}, [base.AGI, -1], [skills.ele, 15]),
		},
		hand: {
			equipped: new Item(),
			none: new Item(),
			knife:        new Item({strBonus: 2, strThreshold: 5}),
			dagger:       new Item({strBonus: 3, strThreshold: 5}),
			glovelight:   new Item({strBonus: 5, strThreshold: 5}),
			crowbar:      new Item({strBonus: 3, strThreshold: 6}),
			gloveheavy:   new Item({strBonus:10, strThreshold: 7}),
			sledgehammer: new Item({strBonus:10, strThreshold: 8}),
			spear:        new Item({strBonus: 8, strThreshold: 7}),
			sword:        new Item({strBonus: 7, strThreshold: 6}),
			powerFist:    new Item({strBonus:10, strThreshold: 7}, [base.STR, 1]),
			jackknife:    new Item({strBonus: 2, strThreshold: 5}, [skills.loc, 7], [skills.tra, 7]),
			cleaver:      new Item({strBonus: 2, strThreshold: 5}, [skills.ind, 20]),
			spearStaff:   new Item({strBonus: 8, strThreshold: 7}, [skills.ind, 10], [derived.health, -25], [derived.psiPool, 10], [derived.psiRegen, 1]),
			spiritStaff:  new Item({strBonus: 8, strThreshold: 7}, [skills.ind, 15], [derived.health, -35]),
			snakeStaff:   new Item({strBonus: 8, strThreshold: 7}, [skills.ind, 20], [derived.health, -50]),
			savage:       new Item({}, [skills.ind, 10]),
			skerder:      new Item({}, [skills.ind, 20]),
			phreakglove:  new Item({strBonus:10, strThreshold: 7, reqs: [[base.INT, 6]]}, [base.DEX, -1], [skills.hac, 10], [skills.ele, 10]),
		},
		tool: {
			equipped: new Item(),
			none: new Item(),
			huxkey:   new Item({}, [skills.loc, 15], [skills.hac, 15]),
			mk3tools: new Item({}, [skills.loc, 10], [skills.hac, 10]),
			mk2tools: new Item({}, [skills.loc,  5], [skills.hac,  5]),
		},
		food: {
			equipped: new Item(),
			none: new Item(),
			brew:          new Item({}, [base.STR, 1], [base.DEX, -2], [base.PER, -2], [psiSkillsArray, -20], [derived.psiRegen, -30]),
			rathoundBBQ:   new Item({}, [base.STR, 1]),
			eelSandwich:   new Item({}, [base.DEX, 1]),
			hopperSteak:   new Item({}, [base.AGI, 1]),
			brwBurger:     new Item({}, [base.CON, 1]),
			salad:         new Item({}, [base.PER, 1]),
			kzozel:        new Item({}, [base.PER, -2], [skills.dod, 50], [psiSkillsArray, -20], [derived.psiRegen, -30]),
			fillet:        new Item({}, [skills.eva, 30]),
			bacon:         new Item({}, [derived.health, 20]),
			clams:         new Item({}, [derived.health, 40]),
			mutieStew:     new Item({}, [derived.health, -20]),
			pentapus:      new Item({}, [derived.carryWeight, 25]),
			rootSoda:      new Item({}, [derived.initiative, 5]),
			coffee:        new Item({}, [derived.movement, 5], [derived.psiRegen, -3]),
			stuffedBat:    new Item({}, [n => derived.detection.multiplier += n, 0.15]),
			junkfood:      new Item({}, [Item.junkfoodEffect, 1]),
			underPie:      new Item({}, [allSkillsArray, 3]),
			jonsSpecial:   new Item({}, [allSkillsArray, 5]),
			// cocktails
			allin:         new Item({}, [allBaseArray, 3], [base.INT, -6]),
			bloodyOligarch:new Item({}, [derived.health, 30], [derived.resolve, -30]),
			cleanDeal:     new Item({}, [skills.tho, 20], [base.PER, -1], [derived.resolve, -30]),
			iceOfSpades:   new Item({}, [skills.met, 20], [derived.movement, -10]),
			layLow:        new Item({}, [skills.ste, 20], [n => skills.eva.multiplier += n, 0.15]),
			shroomMartini: new Item({}, [derived.psiPool, 10]),
			outwork:       new Item({}, [derived.carryWeight, 30]),
			slackjaw:      new Item({}, [base.STR, 1], [base.CON, 1], [skills.ind, 15], [base.INT, -3], [base.WIL, -1]),
			slampipe:      new Item({}, [base.STR, 1], [base.AGI, -1]),
			SOTN:          new Item({}, [skills.pic, 15]),
			whiteDude:     new Item({}, [base.AGI, 3], [skills.per, 15], [base.DEX, -2], [base.PER, -2], [derived.psiRegen, -30]),
		},
		statbuffs: {
			jyStat1: 'STR', jyBuff1: 0,
			jyStat2: 'DEX', jyBuff2: 0,
			stat: 'STR', buff: 0
		}
	};
	setEnumerable(items, 'statbuffs', false);

	/* base tab */
	function levelDown() {
		function reduce(stat, points, currMax, min) {
			for (var id in stat) {
				if (stat[id]._value > currMax) {
					points._value   += stat[id]._value - currMax;
					stat[id]._value -= stat[id]._value - currMax;
				}
			}
			if (points._value < 0) {
				for (id in stat) {
					while (points._value < 0 && stat[id]._value > min) {
						points._value++;
						stat[id]._value--;
					}
				}
			}
		}
		reduce(base, basePoints, maxBase(lvl.value), 3);
		reduce(skills, skillPoints, maxSkill(lvl.value), 0);
		while (featPoints._value < 0) {
			let lastCF = document.getElementById('chosenfeats').lastChild;
			while (!feats[lastCF.ogId].isPurchasable) { // don't remove free feats
				lastCF = lastCF.previousSibling;
			}
			feats[lastCF.ogId].toggle();
		}
		reduce(specs, specPoints, Math.max(0, lvl.value-15), 0);
	}
	function changeStatBuff() {
		const
		oldStat = items.statbuffs.stat,
		oldBuff = items.statbuffs.buff,
		newStat = document.querySelector('input[name=stat]:checked').value,
		newBuff = document.querySelector('input[name=buff]').value |0;
		base[oldStat].bonus -= oldBuff;
		base[newStat].bonus += newBuff;
		items.statbuffs.stat = newStat;
		items.statbuffs.buff = newBuff;
	}
	function setDifficulty() {
		derived.health.difficultyMod = Number(document.querySelector('input[name=diff]:checked').value);
	}
	function craftBonus(isChecked) {
		for (var id of ['mec', 'ele', 'che', 'bio', 'tai']) {
			skills[id].multiplier += isChecked? +15 : -15;
		}
	}
	function updateChosenFeats() {
		let lvl = -4;

		for (var elem of document.getElementById('chosenfeats').children) {
			const feat = feats[elem.ogId];
			const free = !feat.isPurchasable;
			let text = feat.name;
			lvl += free? 0 : 2;
			const pickedAt = Math.max(1, lvl);
			const tooEarly = feat.level > pickedAt;
			text = free? text : pickedAt+': '+text;
			if (!free && elem.textContent.split('+')[0] === text) {
				continue; // skip DOM operations for unchanged feats
			}
			elem.classList.toggle('error', tooEarly);
			elem.setAttribute('data-tooltip', tooEarly?
				feat.tooltip+"\n\n注意：在这个级别不能获得该专长！\n拖动并将其放在列表的更下方。":
				feat.tooltip+"\n\n在此列表中拖动专长可进行重新排序。"
			);
			updateChosenSpecs(feat, text);
		}
	}
	function updateChosenSpecs(feat, text) {
		const elem = document.getElementById(feat.cfid);
		text = text || elem.textContent.split('+')[0];
		elem.textContent = text;

		let totalPoints = 0;
		for (var spec of feat.specializations) {
			totalPoints += spec.value;
		}
		if (totalPoints) {
			const sup = newElem('sup', elem);
			sup.textContent = '+'+totalPoints;
		}
	}

	/* skills tab */
	function baseAbilityMod(base) {
		//  limited float precision to emulate Underrail behavior
		return Math.fround(1 + (base-4) * (base > 4? 0.085 : 0.1));
	}
	function updateDamageBonus(id, value) {
		let strDmg = 0;
		if (id === 'mel') {
			const weapon = items.hand.equipped.stats;
			strDmg = Math.max((weapon.strBonus || 0) * (base.STR.effVal - (weapon.strThreshold || 0)), 0);
		}
		const skillDmg = 0.7 * value;
		const dmg = '武器伤害: '+Math.round(100 + skillDmg + strDmg)+'%';
		skills[id].element.parentNode.setAttribute('data-damage', dmg);
	}
	function updateVersatility() {
		const versatileSkill = calcVersatility();

		for (var id of ['gun','cro','mel','hea']) {
			const normalSkill = skills[id].effVal;
			const elem = skills[id].element.children[1];
			const previous = skills[id].prevV || 0;
			
			if (versatileSkill > normalSkill) {
				updateDamageBonus(id, versatileSkill);
				skills[id].element.title = versatileSkill+' 有效值\n(来自多才多艺专长)';
				writeToDOM(skills[id].length, elem, '('+versatileSkill+')', versatileSkill === previous? true : false);

			} else if (normalSkill !== previous && versatileSkill !== previous) {
				writeToDOM(skills[id].length, elem, skills[id]._ShowEV? '('+normalSkill+')' : '');
			}
			skills[id].prevV = elem.textContent.trim().slice(1, -1) |0;
		}
	}
	function calcVersatility() {
		let v = 0;
		if (feats[163].owned) {
			const commandoMod = (items.belt.equipped === items.belt.commando)? 0.1 : 0;
			v = Math.round(
				Math.max(skills.gun._effVal, skills.cro._effVal, skills.mel._effVal, skills.hea._effVal) *
				(0.6 + specs[11630].effect + commandoMod)
			);
		}
		return v;
	}
	function initSkills() {
		for (var id in skills) {
			let tooltip = '技能协同:\n';
			for (var s in skills[id].synergies) {
				if (skills.propertyIsEnumerable(s)) {
					tooltip += ' '+skills[id].synergies[s]+'% 增幅来自 '+skills[s].name+'\n';
				}
			}
			for (var x in skills) {
				for (s in skills[x].synergies) {
					if (id === s) {
						tooltip += '('+skills[x].synergies[s]+'% 增幅 '+skills[x].name+')\n';
					}
				}
			}
			skills[id].element.parentNode.setAttribute('data-tooltip', tooltip);
		}
	}

	/* feats tab */
	function anyPsiSkill(n) {
		return psiSkillsArray.some(skill => skill.value>=n);
	}
	function featGroup(groupIdx, feat) {
		// checks if any other feats from same group are owned
		const group = [
			[177, 178, 179, 180, 181, 182, 183], // 0 Increased Base Ability
			[184, 185, 186, 187], // 1 Empowered Invocation
			[110, 111, 112, 113], // 2 Tempered Resistance
			[192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 213, 214, 215, 216] // 3 Tattoos
		][groupIdx];
		group.splice(group.indexOf(feat), 1);
		for (var id of group) {
			if (feats[id].owned) { return true; }
		}
		return false;
	}
	function compactFeats(isChecked) {
		document.getElementById('css-featc').textContent = isChecked? '.feat { float:left; width:50px; }' : '';
	}
	function showAllFeats(isChecked) {
		document.getElementById('featfilter').value = '';
		for (var id in feats) {
			feats[id].element.removeAttribute('style');
		}
		document.getElementById('css-feat').textContent = '.feat:disabled { display: '+( isChecked? 'block' : 'none' )+'}';
	}
	function featFilter() {
		const filter = document.getElementById('featfilter').value.trim().toLowerCase();
		for (var id in feats) {
			const css = feats[id].element.style;
			css.display = feats[id].searchtext.includes(filter)? 'block' : 'none';
		}
		document.getElementById('showallfeats').checked = (filter === '');
	}
	function initFeats(featList) {
		for (var id in featList) {
			const feat = featList[id];
			const desc = feat.description;
			const reqs = feat.parseRequirements();
			const DLCs = feat.element.parentNode.classList;
			let title = feat.name;

			feat.searchtext = (title+'\n'+desc+'\n- '+reqs).toLowerCase();

			title = title.toUpperCase();
			if (!feat.isPurchasable) {
				title += ' (无等级需求)';
				feat.searchtext += '\nno level ';
			} else if (feat.isVeteran) {
				title += ' (老兵专长)';
				feat.searchtext += '\nveteran ';
			} else {
				title += ' (等级 '+feat.level+')';
				feat.searchtext += 'level '+feat.level;
			}
			if (DLCs.contains('xpbl')) {
				title += ' [远征] ';
				feat.searchtext += '\nexpedition';
			} else if (DLCs.contains('dlc2')) {
				title += ' [重任] ';
				feat.searchtext += '\nheavy duty';
			}
			feat.tooltip = title+'\n\n'+desc+'\n\n'+'需求\n- '+reqs;
			feat.element.parentNode.setAttribute('data-tooltip', feat.tooltip);
		}
	}
	function lateFeatInit(featList) {
		for (var id in featList) {
			const feat = featList[id];

			//feat.element.value = feat.name;

			if (getTextWidth(feat.name, '16px PF Tempesta Seven Condensed') > 190) {
				feat.element.classList.add('tldr');
			} else if (getTextWidth(feat.name, '16px PF Tempesta Seven Extended') > 190) {
				feat.element.classList.add('long');
			}
		}
	}

	/* specialization tab */
	function showAllSpecs(isChecked) {
		document.getElementById('specfilter').value = '';
		for (var id in specs) {
			specs[id].element.parentNode.removeAttribute('style');
		}
		document.getElementById('css-spec').textContent = '.spec>.disabled { display: '+( isChecked? 'block' : 'none' )+'}';
	}
	function specFilter() {
		const filter = document.getElementById('specfilter').value.trim().toLowerCase();
		for (var id in specs) {
			const css = specs[id].element.parentNode.style;
			css.display = specs[id].searchtext.includes(filter)? 'block' : 'none';
		}
		document.getElementById('showallspecs').checked = (filter === '');
	}
	let specFragment = (function createSpecializations() {
		function dlcTag() {
			switch(specs[id].dlc) {
			case 'xpbl': return '[远征DLC]';
			case 'dlc2': return '[重任DLC]';
			default: return ''; }
		}
		const fragment = new DocumentFragment();
		let names = [], specName, id;

		for (id in specs) {
			names.push([specs[id].name, id]);
		}
		names.sort();

		for ([specName, id] of names) {
			const specDesc = specs[id].description;
			const isDisabled = true;

			specs[id].searchtext = (dlcTag()+' '+specName+' '+specDesc).toLowerCase();

			const specElem = newElem('p', fragment);
			specElem.className = 'spec '+(specs[id].dlc || 'core');
			specElem.setAttribute('data-tooltip', specName.toUpperCase()+' '+dlcTag()+'\n\n'+specDesc);

			// filter on .spec.disabled nodes implicitly sets position:relative
			// would break tooltip positions w/o extra container
			const container = newElem('p', specElem);
			container.classList.toggle('disabled', isDisabled);

			let child = newElem('span', container);
			child.className = 'specname';
			child.textContent = specName;

			child = newElem('mark', container);
			child.textContent = ('  0 / '+specs[id].max+' ').slice(-8);
			child.id = id;

			child = newElem('input', container);
			child.type = 'button';
			child.value = '+';
			child.disabled = isDisabled;

			child = newElem('input', container);
			child.type = 'button';
			child.value = '-';
			child.disabled = isDisabled;
		}
		return fragment;
	})();
	function initSpecializations() {
		document.getElementById('specs').children[1].appendChild(specFragment);
		specFragment = null;
	}

	/* saving & loading */
	function setQuery(str) {
		//let newURL = location.protocol+'//'+location.host+location.pathname;
		let newURL = location.pathname;
		if (str) { newURL += '?'+str; }
		window.history.replaceState(null, '', newURL);
		//window.history.replaceState({}, document.title, newURL);
	}
	function getQuery() {
		const query = location.search.substring(1).split('&')[0];
		return query.includes('=')? query.split('=')[0] : query;
	}
	function arrayToBase64url(arr) {
		let str = String.fromCharCode(...arr);
		str = btoa(unescape(encodeURIComponent(str)));
		return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}
	function base64urlToArray(str) {
		str = str.replace(/-/g, '+').replace(/_/g, '/');
		str = decodeURIComponent(escape(atob(str)));
		return Array.from(str, c => c.charCodeAt(0));
	}
	function saveBuild(buildName, URLonly) {
		let id, saveDataArray = [], bitfield = 0x07FF, base64Data;

		saveDataArray.push(lvl._value);
		for (id in base)   { saveDataArray.push(  base[id]._value); } // must access _value to avoid IBAFeat
		for (id in skills) { saveDataArray.push(skills[id]._value); }
		for (var feat of document.getElementById('chosenfeats').children) {
			saveDataArray.push(Number(feat.ogId));
		}
		for (id in specs)  {
			if (specs[id].value > 0) {
				saveDataArray.push(Number(id));
				saveDataArray.push(specs[id].value);
			}
		}

//		dlc11      && (bitfield &= 0b0000001111111111);
//		dlc10      && (bitfield &= 0b0000010111111111);
//		dlc9       && (bitfield &= 0b0000011011111111);
//		dlc8       && (bitfield &= 0b0000011101111111);
//		dlc7       && (bitfield &= 0b0000011110111111);
//		dlc6       && (bitfield &= 0b0000011111011111);
//		dlc5       && (bitfield &= 0b0000011111101111);
//		dlc4       && (bitfield &= 0b0000011111110111);
//		dlc3       && (bitfield &= 0b0000011111111011);
		heavyduty  && (bitfield &= 0b0000011111111101);
		expedition && (bitfield &= 0b0000011111111110);
		if (bitfield !== 0x07FF) { saveDataArray.push(bitfield); }

		base64Data = arrayToBase64url(saveDataArray);
		setQuery(base64Data);
		URLonly || localStorage.setItem(buildName||'build', base64Data);
	}
	function loadBuild(base64Data) {
		loading = true;
		let saveDataArray, index = 0;
		try {
			saveDataArray = base64urlToArray(base64Data);
			if (saveDataArray.length < 30) { throw 'Not enough data'; }

			for (var id in feats) { feats[id].owned && feats[id].remove(); }
			lvl._value = saveDataArray[index++];

			let dlcFlags = saveDataArray[saveDataArray.length-1];
			dlcFlags > 0x06FF? saveDataArray.pop() : dlcFlags = 0xFFFF;
			(dlcFlags === 0x07FF) && dlcFlags--; // legacy expedition saves
			setExpedition((dlcFlags >> 0) % 2 === 0);
			setHeavyDuty( (dlcFlags >> 1) % 2 === 0);
			//setDLC3(    (dlcFlags >> 2) % 2 === 0);
			//setDLC4(    (dlcFlags >> 3) % 2 === 0);
			//setDLC5(    (dlcFlags >> 4) % 2 === 0);
			//setDLC6(    (dlcFlags >> 5) % 2 === 0);
			//setDLC7(    (dlcFlags >> 6) % 2 === 0);
			//setDLC8(    (dlcFlags >> 7) % 2 === 0);

			for (id in base)   {   base[id]._value = saveDataArray[index++]; }
			for (id in skills) { skills[id]._value = saveDataArray[index++]; }
			for (index; index < saveDataArray.length; index++) {
				if (saveDataArray[index] < 10000) {
					if (feats[saveDataArray[index]].owned) { throw 'Duplicate feat '+saveDataArray[index]; }
					feats[saveDataArray[index]].add();
				} else {
					specs[saveDataArray[index]].value = saveDataArray[++index];
				}
			}
			basePoints._value = calcBasePoints();
			skillPoints._value = calcSkillPoints();
			featPoints._value = calcFeatPoints();
			specPoints._value = calcSpecPoints();

		} catch (error) {
			resetBuild(true);
			errorMessage('Build data: '+base64Data+'\n'+error, 'load build');
			return false;
		}

		updateChosenFeats();
		updatePage();
		loading = false;
	}
	function calcBasePoints() {
		let used = 0, total = 5 + Math.min(25, lvl.value)/4 |0;
		for (var id in base) {
			used += base[id]._value-5; // bypass IBA feat bonus
		}
		used += feats[218].owned? 1 : 0; // Motioner
		return total-used;
	}

	function calcSkillPoints() {
		let used = 0;
		for (var id in skills) {
			used += skills[id].value;
		}
		let total = 80 + lvl.value * 40;
			// 博学者：按 1 级点出，额外获得 15 + (当前等级-1)*5
			if (feats[231] && feats[231].owned) {
				total += 15 + (lvl.value - 1) * 5;
			}
			return total - used;
	}
	let polymathBonus = 0;
	let specialistBonus = 0;



	function calcFeatPoints() {
		let used = 0, total = 2 + lvl.value/2 |0;
		for (var id in feats) {
			if (feats[id].owned && feats[id].isPurchasable) { used += 1; }
		}
		return total-used;
	}
	function calcSpecPoints() {
		let used = 0;
		for (var id in specs) {
			used += specs[id].value;
		}
		let total = Math.max(0, lvl.value - 15);
		// 专家：按 16 级点出，额外获得 1 + (当前等级-16)*1
		if (feats[232] && feats[232].owned) {
			total += 1 + Math.max(0, lvl.value - 16);
		}
		return total - used;
	}
	function resetBuild(resetOpts) {
		if (resetOpts) {
			document.forms[0].reset(); setDifficulty();
			document.forms[1].reset(); changeStatBuff();
			for (var slot in items) {
				document.getElementById(slot).selectedIndex = 0;
				Item.swapEquipped(items[slot], 'none');
			}
			const checkBoxes = ['craftbonus'];
			for (var id of checkBoxes) {
				const cb = document.getElementById(id);
				cb.checked && cb.click();
			}
		}
//		loadBuild('AQUFBQUFBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // base game
		loadBuild('AQUFBQUFBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN--'); // expedition
//		loadBuild('AQUFBQUFBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN-9'); // heavy duty
//		loadBuild('AQUFBQUFBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADfvA'); // all DLCs
		setQuery();
	}

	/* dialog boxes */
	function createDialogBox(purpose) {
		if (document.getElementById('dialog')) { return false; }

		function newSave() {
			const input = this.previousSibling;
			if (input.value) {
				saveBuild(input.value);
				removeDialogBox();
			} else {
				input.placeholder = '请输入名称再保存!';
			}
		}
		function saveThis() {
			saveBuild(this.value);
			removeDialogBox();
		}
		function loadThis() {
			setTimeout(function asyncLoad() {
				resetBuild(false);
				loadBuild(localStorage.getItem(this.value));
			}.bind(this), 0);
			removeDialogBox();
		}
		function deleteThis() {
			localStorage.removeItem(this.previousSibling.value);
			this.parentNode.removeChild(this.previousSibling);
			this.parentNode.removeChild(this.nextSibling);
			this.parentNode.removeChild(this);
		}
		function fileOpen() {
			this.nextSibling.click();
		}

		const dialog = document.createElement('div');
		dialog.id = 'dialog';
		dialog.textContent = purpose+' 构建[浏览器本地存储]';

		let elem = newElem('p', dialog);
		elem.title = '单击或按Esc关闭';
		elem.onclick = removeDialogBox;
		elem.textContent = 'X';

		elem = newElem('br', dialog);

		if (purpose === 'Save') {
			elem = newElem('input', dialog);
			elem.type = 'text';
			elem.className = 'misc buildname';
			elem.placeholder = 'Save as...';
			elem.title = '输入构建名称，然后单击“确认”或按Enter键保存';

			elem = newElem('input', dialog);
			elem.type = 'button';
			elem.className = 'misc';
			elem.value = '确认';
			elem.onclick = newSave;
			elem.id = 'newsave';

			elem = newElem('br', dialog);
		}
		if (localStorage.length !== 0) {
			let buildList = newElem('div', dialog);
			buildList.className = purpose.toLowerCase()+' buildlist';

			const sortedLS = Object.keys(localStorage).sort();
			for (var key of sortedLS) {
				if (localStorage.hasOwnProperty(key)) {
					elem = newElem('input', buildList);
					elem.type = 'button';
					elem.className = 'misc buildname';
					elem.value = key;
					if (purpose === 'Load') { elem.onclick = loadThis; elem.title = '单击以加载此构建'; }
					if (purpose === 'Save') { elem.onclick = saveThis; elem.title = '单击以覆盖保存构建'; }

					elem = newElem('input', buildList);
					elem.type = 'button';
					elem.className = 'misc';
					elem.value = '删除';
					elem.onclick = deleteThis;

					elem = newElem('br', buildList);
				}
			}
		} else {
			elem = newElem('span', dialog);
			elem.innerHTML = 'No saved builds found!<br>';
		}

		elem = newElem('a', dialog);
		elem.className = 'button';
		elem.download = location.hostname+' build list.json';
		elem.href = makeFile(exportBuilds(), 'application/json');
		elem.title = '将此构建列表导出为文件';
		elem.textContent = '将此列表导出为文件';

		elem = newElem('a', dialog);
		elem.className = 'button';
		elem.onclick = fileOpen;
		elem.title = '从文件导入构建列表';
		elem.textContent = '从文件导入构建';

		elem = newElem('input', dialog);
		elem.type = 'file';
		elem.accept = 'application/json';

		elem = newElem('a', dialog);
		elem.className = 'button';
		elem.onclick = clearBuilds;
		elem.title = '删除此列表中的所有构建';
		elem.textContent = '删除构建';

		dialog.style.transform = 'translateX(-520px)';
		document.body.appendChild(dialog);
		setTimeout(() => dialog.style.transform = 'translateX(0)', 10);
	}
	function removeDialogBox() {
		const elem = document.getElementById('dialog');
		if (elem) {
			elem.style.transform = 'translateX(-520px)';
			setTimeout(() => document.body.removeChild(elem), 250);
		}
	}
	function makeFile(content, mimetype) {
		const data = new Blob([content], { type:mimetype });
		if (fileData !== null) { window.URL.revokeObjectURL(fileData); }
		fileData = window.URL.createObjectURL(data);
		return fileData;
	}
	function exportBuilds() {
		let builds = {};
		for (var key in localStorage) {
			if (localStorage.hasOwnProperty(key)) {
				builds[key] = localStorage[key];
			}
		}
		return JSON.stringify(builds, null, 4);
	}
	function importBuilds(file) {
		const reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function(event) {
			try {
				const builds = JSON.parse(event.target.result);
				for (var key in builds) {
					if (!(localStorage.getItem(key) && !confirm('Build "'+key+'" already exists, replace?'))) {
						localStorage.setItem(key, builds[key]);
					}
				}
			} catch (error) {
				errorMessage(error, 'import builds from file');
			}
		};
		reader.onerror = () => errorMessage(reader.error.name, 'read file');
		removeDialogBox();
	}
	function clearBuilds() {
		if (confirm('您确定要删除所有构建吗?')) {
			localStorage.clear();
			removeDialogBox();
		}
	}

	/* expansion handling */
	function enableSkill(id) {
		setEnumerable(skills, id, true);
	}
	function enableFeat(id, list) {
		feats[id] = list[id];
		setEnumerable(feats, id, true);
	}
	function disableSkill(id) {
		if (skills[id].value > 0) {
			skillPoints.value += skills[id].value;
			skills[id].value = 0;
		}
		setEnumerable(skills, id, false);
	}
	function disableFeat(id) {
		if (feats[id].owned) {
			feats[id].toggle();
		}
		setEnumerable(feats, id, false);
	}
	function setExpedition(bool) {
		if (expedition === bool) { return false; }

		document.getElementById('expedition').checked = expedition = bool;
		dlcHandler(1);
	}
	function setHeavyDuty(bool) {
		if (heavyduty === bool) { return false; }

		document.getElementById('heavyduty').checked = heavyduty = bool;
		dlcHandler(2);
	}
	function dlcHandler(dlc) {
		const style = document.getElementById('css-dlc');
		let id, css = '';

		switch (dlc) {
		case 1:
			if (expedition) {
				lvl.max = 30;
				enableSkill('tem');
				for (id in xpblFeats) { enableFeat(id, xpblFeats); }
				initSkills();
			} else {
				lvl.max = 25;
				disableSkill('tem');
				for (id in xpblFeats) { disableFeat(id); }
				for (id in specs) { specs[id].value && (specPoints.value += specs[id].value) && (specs[id].value = 0); }
				initSkills();
				lvl.value > lvl.max && modifyStat('lvl', 'level', false, lvl.value - lvl.max);
			}
			break;

		case 2:
			if (heavyduty) {
				enableSkill('hea');
				for (id in dlc2Feats) { enableFeat(id, dlc2Feats); }
				initSkills();
				document.getElementById('heavyduty').parentNode.parentNode.style = '';
			} else {
				disableSkill('hea');
				for (id in dlc2Feats) { disableFeat(id); }
				initSkills();
			}
			break;

		default:
			return false;
		}

		 expedition               && (css += 'h2,h3 { filter:hue-rotate(151deg); } ');
		!expedition && !heavyduty && (css += '.core { display:none; } ');
		!expedition               && (css += '.xpbl { display:none; } ');
		!heavyduty                && (css += '.dlc2 { display:none; } ');
		style.textContent = css;

		document.getElementById('featfilter').value && featFilter();
		document.getElementById('specfilter').value && specFilter();
	}
	function setInfusion(bool) {
		const box = document.getElementById('infusion');
		const pos = box.getBoundingClientRect();
		box.style.zIndex = '1';
		box.style.position = 'fixed';
		box.style.top = pos.top+'px';
		box.style.left = pos.left+'px';
		box.style.animation = 'fail 10s linear forwards';
		box.parentNode.onclick = event => event.preventDefault();
		setTimeout(()=> box.parentNode.style.animation = 'fadeout 1s forwards', 2000);
		box.parentNode.parentNode.style.pointerEvents = 'none';
		console.error('Uncaught FallingElementError: Infusion checkbox fell off! :(');
		'Seriously, no Infusion spoilers here yet. Sorry.';
	}

	/* misc. helpers */
	function writeToDOM(leftpad, element, string, noChange) {
		element.textContent = ('     '+string).slice(-leftpad);

		if (!loading && !noChange) {
			element.classList.remove('changed');
			element.offsetParent; // forces reflow
			element.classList.add('changed');
		}
	}
	function newElem(type, parent) {
		return parent.appendChild(document.createElement(type));
	}
	function indexOf(elem) {
		return [...elem.parentNode.children].indexOf(elem);
	}
	function setEnumerable(obj, prop, bool) {
		Object.defineProperty(obj, prop, {
			configurable: true,
			enumerable: bool
		});
	}
	function getTextWidth(text, fontName) {
		const c = getTextWidth.c || (getTextWidth.c = document.createElement('canvas'));
		const ctx = c.getContext('2d');
		ctx.font = fontName;
		return ctx.measureText(text).width;
	}
	function errorMessage(err, msg) {
		console.error(err);
		alert('Failed to '+msg+'. Details logged to browser console. (F12)');
	}
	function modifyStat(id, type, increase, repeats) {
		// control logic for +/- buttons
		const sign = increase? +1 : -1;
		const decrease = !increase;
		let changed = false;

		// access "private" _values to avoid unnecessary DOM updates
		function calcChange(stat, points, currMax, min) {
			let change = 0;
			if (increase && points.value > 0 && stat._value < currMax) {
				change = Math.min(points.value, currMax - stat._value);

			} else if (decrease && stat._value > min) {
				change = stat._value - min;
			}
			points._value -= sign * Math.min(change, repeats);
			stat._value   += sign * Math.min(change, repeats);
		}
		function maxAllowedBase(stat) {
			let pointsUsed = 0;
			for (var id in base) {
				if (base[id]._value > 10) {
					pointsUsed += base[id]._value-10;
				}
			}
			const pointsLeft = Math.max(0, maxBase(lvl.value) - 10 - pointsUsed);
			return Math.max(10, stat._value) + pointsLeft;
		}

		switch (type) {
		case 'level':
		while (repeats--) {
			if (increase && lvl.value < lvl.max || decrease && lvl.value > 1) {
				changed = true;

				// ALWAYS base gain
				skillPoints._value += sign * 40;

				// Extra +5 ONLY if Polymath already owned
				//if (feats[231]?.owned) {
				//	skillPoints._value += sign * 5;
				//}



				if (increase) { lvl._value += sign; }
				if (lvl.value % 2 === 0) { featPoints._value += sign; }
				if (lvl.value % 4 === 0 && lvl.value < 25) { basePoints._value += sign; }

				// Extra +1 ONLY if Specialist already owned
				//if (feats[232]?.owned) {
				//	if (lvl.value > 15) { specPoints._value += sign; }
				//}
				if (lvl.value > 15) { specPoints._value += sign; }
				if (decrease) { lvl._value += sign; }

			} else break;
		}
		break;



		case 'base':
			calcChange(base[id], basePoints, maxAllowedBase(base[id]), 3);
			Item.checkEquippedReqs();
			break;

		case 'skill':
			calcChange(skills[id], skillPoints, maxSkill(lvl.value), 0);
			Item.checkEquippedReqs();
			break;

		case 'specs':
			calcChange(specs[id], specPoints, Math.min(specs[id].max, lvl.value-15), 0);
			break;

		default:
			return false;
		}
	}
	function updatePage() {
		// 先重新计算受专长影响的点数
		skillPoints._value = calcSkillPoints();
		specPoints._value = calcSpecPoints();
	
		lvl.update();
		basePoints.update();
		skillPoints.update();
		featPoints.update();
		specPoints.update();
		for (var id in base) { base[id].update(); }
		for (id in skills) { skills[id].update(); }
		for (id in feats) { feats[id].update(); }
		for (id in specs) { specs[id].update(); }
		for (id in derived) { derived[id].update(); }
		updateVersatility();
		//setQuery();
		saveBuild(null, true);
	}
	function copyBuildToClipboard() {
		navigator.clipboard.writeText(window.location.href).then(function() {
			const parent = document.getElementById('URL').parentNode;
			const notification = newElem('span', parent);
			notification.className = 'tooltip';
			notification.style.display = 'block';
			notification.style.bottom = 'inherit';
			notification.style.right = 'inherit';
			notification.style.animation = 'fadeout 2s ease-in';
			notification.innerText = 'Build link copied to clipboard!';
			setTimeout(() => parent.removeChild(notification), 2000);
		}, function(err) {
			console.error('Could not copy text to clipboard: ', err);
		});
	}

	/* event handling */
	function getStatFromClick(event) {
		const et = event.target;

		const stat = et.parentNode.lastChild.previousSibling.previousSibling.id;
		const type = (stat === 'lvl')? 'level' : et.closest('article').id;
		const increase = (et.value === '+');
		const multiplier = event.ctrlKey? 10 + 5*lvl.max : event.shiftKey? 5 : 1;
		return [stat, type, increase, multiplier];
	}
	function clickHandler(event) {
		// button and button-like element input handling
		const et = event.target;

		if (et.type === 'button') {
			if (et.value.length === 1) { // all +/- buttons
				modifyStat(...getStatFromClick(event));
				updatePage();

			} else if (et.classList.contains('feat')) {
				feats[et.id].toggle();
				updatePage();

			} else if (et.className === 'misc') {
				switch (et.id) {
				case 'load' : createDialogBox('Load'); break;
				case 'save' : createDialogBox('Save'); break;
				case 'reset': resetBuild(true); break;
				case 'URL': saveBuild(null, true); copyBuildToClipboard(); break;
				}
			}
		} else if (/min|max/.test(et.className)) {
			tabSystem.update(et);
		}
	}
	function changeHandler(event) {
		// dropdown, radio & checkbox input handling
		const et = event.target;

		switch (et.type) {
		case 'checkbox':
			switch (et.id) {
			case 'showallfeats': showAllFeats(et.checked); break;
			case 'compactfeats': compactFeats(et.checked); break;
			case 'showallspecs': showAllSpecs(et.checked); break;
			case 'craftbonus':     craftBonus(et.checked); break;
			case 'expedition':  setExpedition(et.checked); break;
			case 'heavyduty':    setHeavyDuty(et.checked); break;
			case 'infusion':      setInfusion(et.checked); break;
			}
			break;

		case 'radio':
			switch (et.name) {
			case 'stat': changeStatBuff(); break;
			case 'diff': setDifficulty(); break;
			}
			break;

		case 'select-one':
			Item.swapEquipped(items[et.id], et.value);
			Item.checkEquippedReqs();
			break;

		case 'file':
			importBuilds(event.target.files[0]);
			break;
		}
		updatePage();
	}
	function keyHandler(event) {
		switch (event.key) {
		case 'Escape': removeDialogBox(); break;
		case 'Enter': const e = document.getElementById('newsave'); e && e.click(); break;
		}
	}
	
		function performDragSort(dropTarget, clientY) {
		if (!dropTarget || dropTarget === draggedElem) return;
		const rect = dropTarget.getBoundingClientRect();
		const midY = rect.top + rect.height / 2;
		const draggedIdx = indexOf(draggedElem);
		const targetIdx = indexOf(dropTarget);

		if (clientY < midY) {
			// 插入到目标前面
			if (draggedIdx > targetIdx) {
				draggedElem.parentNode.insertBefore(draggedElem, dropTarget);
				updateChosenFeats();
			}
		} else {
			// 插入到目标后面
			if (draggedIdx < targetIdx) {
				const next = dropTarget.nextSibling;
				draggedElem.parentNode.insertBefore(draggedElem, next);
				updateChosenFeats();
			}
		}
	}
	
		function dragStart(e) {
		dragging = true;
		draggedElem = this;
		if (e.type === 'mousedown') {
			document.addEventListener('mousemove', dragMove);
			document.addEventListener('mouseup', dragEnd);
			e.preventDefault();
		}
	}

		function dragMove(e) {
			if (!dragging) return;
			const target = document.elementFromPoint(e.clientX, e.clientY);
			if (!target) return;
			const dropTarget = target.closest('.chosenfeat');
			if (!dropTarget || dropTarget === draggedElem) return;
			performDragSort(dropTarget, e.clientY);
		}

		function dragEnd(e) {
			dragging = false;
			document.removeEventListener('mousemove', dragMove);
			document.removeEventListener('mouseup', dragEnd);
			updatePage();
		}

	/* responsive crap */
	const touchSystem = {
		tap: false,
		holding: false,
		swiping: false,
		panning: false,
		dragging: false,
		tab: null,
		count: 0,
		swipeStartThreshold: 30,
		holdDelay: 250,
		sX: 0, dX: 0,
		holdButton: function(stat, type, increase) {
			this.count += 1;
			const delay = 250/this.count**(1/2);
			modifyStat(stat, type, increase, 1);
			updatePage();
			setTimeout(() => {
				this.count && this.holdButton(stat, type, increase);
			}, delay);
		},
		swipe: function(touches, target) {
			this.dX = touches[0].clientX - this.sX;
			if (!this.dragging && (this.swiping || Math.abs(this.dX) > this.swipeStartThreshold)) {
				this.swiping = true;
				this.tab = this.tab || target.closest('article');
				this.tab.style.left = this.dX+'px';
			}
		},
		endSwipe: function() {
			const tab = this.tab;
			tab.style.left = '0';

			if (Math.abs(this.dX) > screen.width/3) {
				let newTab;
				if (this.dX < 0) {
					newTab = tab.nextElementSibling || tab.parentNode.firstElementChild;
					newTab.style.animation = 'fromright .3s ease-out';
					tab.style.animation    =    'toleft .3s ease-out';
				} else {
					newTab = tab.previousElementSibling || tab.parentNode.lastElementChild;
					newTab.style.animation = 'fromleft .3s ease-out';
					tab.style.animation    =  'toright .3s ease-out';
				}
				setTimeout(() => tabSystem.update(newTab), 100);
				setTimeout(() => newTab.style = tab.style = '', 600);
			}
			this.dX = 0;
			this.tab = null;
			this.swiping = false;
		},
			dragHandler: function(event) {
		if (dragging && this.holding && !this.panning && !this.swiping) {
			this.dragging = true;
			event.preventDefault();
			try {
				const touch = event.touches[0];
				const target = document.elementFromPoint(touch.pageX, touch.pageY);
				if (!target) return;
				const dropTarget = target.closest('.chosenfeat');
				if (!dropTarget || dropTarget === draggedElem) return;
				performDragSort(dropTarget, touch.clientY);
			} catch(e) {}
		}
	},
		scrollHandler: function(event) {
			this.panning = true;
		},
		startHandler: function(event) {
			this.panning = false;
			if (!this.tap) {
				const et = event.target;

				this.sX = event.touches[0].clientX;
				if (et.type === 'button' && et.value.length === 1) {
					this.holdButton(...getStatFromClick(event));
				}
				this.tap = true;
				setTimeout(() => {
					if (this.tap) {
						this.holding = true;
						if (dragging && !this.panning && !this.swiping) {
							navigator.vibrate(40);
						}
					}
				}, this.holdDelay);
			}
		},
		moveHandler: function(event) {
			if (dragging && this.holding) {
				event.preventDefault();
			}
			if (tabSystem.mode === 1) {
				this.swipe(event.touches, event.target);
			}
		},
		endHandler: function(event) {
			const et = event.target;

			if (et.type === 'button' && et.value.length === 1) {
				event.preventDefault();
			}
			if (tabSystem.mode === 1 && this.swiping) {
				this.endSwipe();
			}
			this.count = 0;
			this.tap = false;
			this.holding = false;
			this.panning = false;
			this.dragging = false;
		}
	};
	const tabSystem = {
		mode: 4,
		open: 4,
		base: true,
		skill: true,
		feats: true,
		specs: true,
		// old singleTabCSS
		//'#feats [data-tooltip]:hover::before,#specs [data-tooltip]:hover::before { left:0; top:25px; width:calc(100% - 30px) } .max { display:none; } nav { top:-10px; right:0; height:30px; } nav .min, nav:hover .min { animation:none; } input.filter { width:100px; right:140px; }',
		//'#feats [data-tooltip]:hover::before,#specs [data-tooltip]:hover::before { left:0; top:25px; width:calc(100% - 30px) } .max { display:none; } nav:before { content:"☰"; padding:0; position:absolute; top:-4px; } nav { top:0; right:0; margin:5px; height:15px; width:10px; z-index:2; } nav .min { display:none; } nav:hover:before { content:"" } nav:hover { outline:2px solid var(--hue7); background:var(--hue3); height:225px; width:auto; box-shadow:0 0 9px 6px var(--hue0); } nav:hover .min { animation:none; display:block; margin:10px 5px; padding:10px; }',
		singleTabCSS: '#feats [data-tooltip]:hover::before,#specs [data-tooltip]:hover::before { left:0; top:25px; width:calc(100% - 30px) } nav { top:0; right:0; margin:5px; height:15px; width:10px; z-index:2; } nav .min { display:none; } nav:hover { outline:2px solid var(--hue7); background:var(--hue3); height:225px; width:auto; box-shadow:0 0 9px 6px var(--hue0); } nav:hover .min { animation:none; display:block; margin:10px 5px; padding:10px; }',
		toggle: function(id) {
			this[id] = !this[id];
			this.open += this[id]? +1 : -1;
			document.getElementById(id).classList.toggle('hide');
			document.getElementById(id+'_min').classList.toggle('hide');
		},
		update: function(element) {
			let id, tabOrder = ['base', 'skill', 'feats', 'specs'];

			if (element) {
				const target = element.id.split('_')[0];
				if (this.mode === 1) {
					this.toggle(target);
					for (id of tabOrder.reverse()) {
						this[id] && this.toggle(id);
					}
				}
				this.toggle(target);

			} else {
				let tabsToOpen = this.open - this.mode;
				tabsToOpen > 0 && tabOrder.reverse();
				for (id of tabOrder) {
					if ( this[id] && tabsToOpen > 0) { this.toggle(id); tabsToOpen--; }
					if (!this[id] && tabsToOpen < 0) { this.toggle(id); tabsToOpen++; }
				}
			}
			document.getElementById('css-tabs').textContent = this.open === 1? this.singleTabCSS : '';
			for (id of tabOrder) {
				document.getElementById(id+'_max').textContent = this.open === 1? '☰' : 'X';
			}
		},
		checkWindowSize: function() {
			//const w = window.visualViewport? visualViewport.width : innerWidth;
			const w = window.innerWidth;
			const prevMode = this.mode;
			this.mode = w > 1480? 4 : w > 1100? 3 : w > 740? 2 : 1;
			this.mode !== prevMode && this.update();
			document.querySelector(':root').style.setProperty('--vh', window.innerHeight/100 + 'px');
		},
	};

	/* initialization */
	document.addEventListener('DOMContentLoaded', function earlyInit() {
		tabSystem.checkWindowSize();
		initFeats(feats);
		initFeats(xpblFeats);
		initFeats(dlc2Feats);
		initSpecializations();
		getQuery()? loadBuild(getQuery()) : resetBuild(false);

		/* april fools
		if (new Date().toISOString().slice(5,10) === '04-01') {
			newElem('script', document.head).src = '../junk/wf.js';
		}/**/
	});
	window.onload = function lateInit() {
		initSkills();
		lateFeatInit(feats);
		lateFeatInit(xpblFeats);
		lateFeatInit(dlc2Feats);
		document.getElementById('help').firstChild.innerHTML += '<br><br>Underrail 版本 '+version;
		for (var elem of document.querySelectorAll('input[type=button]')) {
			if (elem.value.length === 1) {
				elem.title = `Ctrl+单击: ${elem.value}全部点数\nShift+单击: ${elem.value}5 点数`;
			}
		}
		document.getElementById('featfilter').oninput = featFilter;
		document.getElementById('specfilter').oninput = specFilter;
		document.getElementById('statbuff'  ).oninput = changeStatBuff;
		document.onchange = changeHandler;
		document.onclick = clickHandler;
		window.onkeydown = keyHandler;

		document.ontouchstart  = () => touchSystem.startHandler(event);
		document.ontouchend    = () => touchSystem.endHandler(event);
		document.ontouchcancel = () => touchSystem.endHandler(event);
		document.addEventListener('touchmove', () => touchSystem.moveHandler(event), {passive:false});
		document.getElementById('base').children[1].onscroll = () => touchSystem.scrollHandler(event);
		window.onresize = () => tabSystem.checkWindowSize();

	};

})();
