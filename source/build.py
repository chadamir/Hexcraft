import re, pathlib
root = pathlib.Path(__file__).parent
def lib(p):
    t = (root/p).read_text()
    t = re.sub(r'//# sourceMappingURL=.*', '', t)
    return t.replace('</script', '<\\/script')
shell = (root/'src/shell.html').read_text()
app = '\n'.join((root/'src'/f).read_text() for f in ['core.js','ui.js','props.js','help.js','comp.js','compui.js','clip.js','maker.js','gamedata.js','io.js'])
assert '</script' not in app
out = shell.replace('/*VENDOR_JSPDF*/', lib('node_modules/jspdf/dist/jspdf.umd.min.js')) \
           .replace('/*VENDOR_SVG2PDF*/', lib('node_modules/svg2pdf.js/dist/svg2pdf.umd.min.js')) \
           .replace('/*ICONS*/', (root/'src/icons.js').read_text()) \
           .replace('/*APP*/', app)
(root.parent/'index.html').write_text(out)
print('built', len(out)//1024, 'KB')

# ---- help / hover-tip coverage check ----
import re as _re
src = {f: (root/'src'/f).read_text() for f in ['core.js','ui.js','props.js','help.js','comp.js','compui.js','clip.js','maker.js','gamedata.js','io.js']}
shell_t = (root/'src/shell.html').read_text(); help_t = src['help.js']; allsrc = ''.join(src.values())
acts = set(_re.findall(r'data-act="([a-zA-Z0-9-]+)"', allsrc + shell_t))
missing_acts = sorted(a for a in acts if not a.startswith('help-') and not _re.search(r"(['\"]?)%s\1\s*:" % _re.escape(a), help_t))
labels = set(_re.findall(r"F\('([^']+)'", src['props.js'] + src['compui.js']))
missing_fields = sorted(l for l in labels if ("'%s':" % l) not in help_t and ("'%s':" % l) not in src['compui.js'])
tools = [t for t in _re.findall(r"\['([a-z]+)', '[A-Z]', '", src['ui.js'])]
missing_tools_help = [t for t in tools if t not in ('types',) and ("TOOL_HINTS" in src['ui.js']) and not _re.search(r"\b%s:\s*'" % t, src['ui.js'])]
help_secs = set(_re.findall(r"^  \['([a-z]+)', '", help_t, _re.M))
menu_secs = set(_re.findall(r'data-act="help-([a-z]+)"', shell_t))
if missing_acts or missing_fields or missing_tools_help or (help_secs - menu_secs) or (menu_secs - help_secs):
    print('HELP COVERAGE GAPS:')
    if missing_acts: print('  buttons without hover tips:', missing_acts)
    if missing_fields: print('  fields without hover tips:', missing_fields)
    if missing_tools_help: print('  tools without hints:', missing_tools_help)
    if help_secs - menu_secs: print('  help sections missing from Help menu:', sorted(help_secs - menu_secs))
    if menu_secs - help_secs: print('  Help menu items without a section:', sorted(menu_secs - help_secs))
else:
    print('help coverage OK:', len(acts), 'buttons,', len(labels), 'fields,', len(help_secs), 'help sections')
