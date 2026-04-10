import sys, importlib, pkgutil, os
venv_site = r'c:\Users\Admin\Downloads\minorProject\minorProject\minorProject\Source Code\RecipeLens\venv\Lib\site-packages'
sys.path.insert(0, venv_site)
print('venv_site', venv_site)
print('sys.path[0]', sys.path[0])
print('find_spec tensorflow:', importlib.util.find_spec('tensorflow'))
print('find_spec tensorflow.python:', importlib.util.find_spec('tensorflow.python'))
print('find_loader tensorflow:', pkgutil.find_loader('tensorflow'))
print('find_loader tensorflow.python:', pkgutil.find_loader('tensorflow.python'))
print('tensorflow init path:', os.path.join(venv_site, 'tensorflow', '__init__.py'))
print('module exists:', os.path.exists(os.path.join(venv_site, 'tensorflow', 'python', 'tools', 'module_util.py')))
