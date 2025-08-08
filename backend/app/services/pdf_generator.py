import os
import subprocess
from jinja2 import Environment, FileSystemLoader
from app.models.task import Task
from typing import List

TEMPLATE_DIR = "tex_templates"
OUTPUT_DIR = "generated"

os.makedirs(OUTPUT_DIR, exist_ok=True)

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def generate_tex_file(tasks: List[Task], tex_path: str):
    template = env.get_template("base_template.tex")
    tex_content = template.render(tasks=tasks)
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)

def compile_tex_to_pdf(tex_path: str) -> str:
    pdf_path = tex_path.replace(".tex", ".pdf")
    subprocess.run(["tectonic", tex_path, "--outdir", OUTPUT_DIR], check=True)
    return pdf_path
