declare module 'react-native-print' {
  const Print: {print: (options: {html: string}) => Promise<void>};
  export default Print;
}
