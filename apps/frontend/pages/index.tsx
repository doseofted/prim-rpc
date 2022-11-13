import Head from 'next/head'
import { Docs } from "@doseofted/prim-ui/react"
import docs from "@doseofted/prim-example/dist/docs.json"
import { Lights } from '../components/Lights'

export default function Home() {
  return (
    <>
      <Head>
        <title>Hi</title>
      </Head>
      <div className='bg-gray-100 font-sans'>
        <Lights></Lights>
        <Docs docs={docs} />
      </div>
    </>
  )
}
