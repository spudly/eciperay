import {Link} from 'react-router-dom';

const OPTIONS = [
  {
    label: 'Manual entry',
    description: 'Type in a recipe from scratch',
    to: '/add/manual',
  },
  {
    label: 'Import from URL',
    description: 'Paste a recipe link',
    to: '/add/url',
  },
  {
    label: 'Import from image',
    description: 'Upload a photo of a recipe',
    to: '/add/image',
  },
  {
    label: 'Import from text',
    description: 'Paste rich text from Word or the web',
    to: '/add/text',
  },
];

export const AddPage = () => (
  <div>
    <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Recipe</h1>
    <div className="space-y-3">
      {OPTIONS.map(opt => (
        <Link
          key={opt.to}
          to={opt.to}
          className="
            block rounded-xl bg-white p-4 shadow-sm
            hover:bg-gray-50
          "
        >
          <p className="font-semibold text-gray-900">{opt.label}</p>
          <p className="text-muted text-sm">{opt.description}</p>
        </Link>
      ))}
    </div>
  </div>
);
