import { Injectable, Inject } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class EmailTemplatesService {
    constructor(
        @Inject('EMAIL_TEMPLATE') private readonly templatePath: string,
    ) { }

    getTemplate(templateName: string): string {
        const file = join(this.templatePath, `${templateName}.html`);
        return readFileSync(file, 'utf8');
    }
}
