const fse = require('fs-extra');
const ejs = require('ejs');
const inquirer = require('inquirer');
const glob = require('glob');

function ejsRender(options) {
	const dir = options.targetPath;
	const projectInfo = {
		...options.data,
		version: options.data.projectVersion
	};

	return new Promise((resolve, reject) => {
		glob(
			'**',
			{
				cwd: dir,
				ignore: options.ignore || '',
				nodir: true
			},
			(err, files) => {
				if (err) {
					reject(err);
				}
				Promise.all(
					files.map(file => {
						const filePath = path.join(dir, file);
						return new Promise((res, rej) => {
							ejs.renderFile(filePath, projectInfo, {}, (e, result) => {
								if (e) {
									rej(e);
								} else {
									fse.writeFileSync(filePath, result);
									res(result);
								}
							});
						});
					})
				)
					.then(() => {
						resolve();
					})
					.catch(error => {
						reject(error);
					});
			}
		);
	});
}

async function install(options) {
	const projectPrompt = [];
	const descriptionPrompt = {
		type: 'input',
		name: 'description',
		message: '请输入项目描述信息',
		default: '',
		validate(v) {
			const done = this.async();

			setTimeout(() => {
				if (!v) {
					done('请输入项目描述信息');
					return;
				}
				done(null, true);
			}, 0);
		}
	};
	projectPrompt.push(descriptionPrompt);
	const projectInfo = await inquirer.prompt(projectPrompt);
	options.projectInfo.description = projectInfo.description;
	const { sourcePath, targetPath } = options;

	try {
		// 确保目录存在（不存在则生成）
		fse.ensureDirSync(sourcePath);
		fse.ensureDirSync(targetPath);
		// 拷贝代码
		fse.copySync(sourcePath, targetPath);

		const templateIgnore = options.templateInfo.ignore || [];
		const ignore = ['**/node_modules/**', ...templateIgnore];
		await ejsRender({ ignore, targetPath, data: options.projectInfo });
	} catch (e) {
		throw new Error(e);
	}
}

module.exports = install;
