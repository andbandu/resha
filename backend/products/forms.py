from __future__ import annotations

import json
import re

from django import forms
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import Product, ProductColor


class LinesListField(forms.CharField):
    """Form field editing a JSON list of strings as one line per item."""

    widget = forms.Textarea(
        attrs={
            "rows": 4,
            "class": "vLargeTextField",
            "placeholder": "Enter one bullet item per line...",
        }
    )

    def prepare_value(self, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return "\n".join(str(v) for v in parsed)
            except (TypeError, ValueError):
                return value
        if isinstance(value, (list, tuple)):
            return "\n".join(str(v) for v in value)
        return ""

    def clean(self, value):
        raw = super().clean(value) or ""
        return [line.strip() for line in raw.splitlines() if line.strip()]


class ColorPickerWidget(forms.TextInput):
    """Text hex field paired with an HTML5 color picker input."""

    def render(self, name, value, attrs=None, renderer=None):
        val = (value or "#B88692").strip()
        if not re.match(r"^#[0-9A-Fa-f]{6}$", val):
            val = "#B88692"
        attrs = dict(attrs or {})
        attrs.setdefault("style", "width: 96px; font-family: monospace; text-transform: uppercase;")
        attrs.setdefault("maxlength", "7")
        text_html = super().render(name, val, attrs=attrs, renderer=renderer)
        picker_html = format_html(
            '<input type="color" value="{}" '
            'style="width:32px;height:28px;padding:0;border:1px solid #d9c3c8;vertical-align:middle;margin-left:6px;cursor:pointer;background:transparent;" '
            'oninput="var t=this.previousElementSibling;if(t){{t.value=this.value.toUpperCase();}}" '
            'aria-label="Pick swatch color" />',
            val,
        )
        return mark_safe(
            f'<span style="display:inline-flex;align-items:center;">{text_html}{picker_html}</span>'
        )


class ProductAdminForm(forms.ModelForm):
    details = LinesListField(
        required=False,
        help_text="Enter one construction highlight per line (saved as a JSON list).",
    )
    care_instructions = LinesListField(
        required=False,
        help_text="Enter one care instruction per line (saved as a JSON list).",
    )

    class Meta:
        model = Product
        fields = "__all__"


class ProductColorInlineForm(forms.ModelForm):
    class Meta:
        model = ProductColor
        fields = "__all__"
        widgets = {
            "hex": ColorPickerWidget(),
        }
