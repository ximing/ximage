import { Seg } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { CONVERT_OUTPUTS, outputLabel, type ConvertOutput } from '../../tools/convert/outputs';

export function OutputFormats({
  value,
  onChange,
}: {
  value: ConvertOutput;
  onChange: (format: ConvertOutput) => void;
}) {
  const t = useText();
  return (
    <Seg label={t('common.outputFormat')} wrap>
      {CONVERT_OUTPUTS.map((format) => (
        <button key={format} type="button" aria-pressed={value === format} onClick={() => onChange(format)}>
          {outputLabel(format)}
        </button>
      ))}
    </Seg>
  );
}
